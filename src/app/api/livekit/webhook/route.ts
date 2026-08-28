import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";

import { prisma } from "@/lib/prisma";
import { enqueueNotification } from "@/lib/notifications/enqueue";
import { NotificationTypes } from "@/lib/notifications/types";
import { assertTransition } from "@/lib/livekit/state-machine";

// Prevent response caching for this route.
export const dynamic = "force-dynamic";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error("Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET env vars.");
}

const receiver = new WebhookReceiver(apiKey, apiSecret);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Midnight UTC of the given date — used as the Attendance sessionDate key. */
function toSessionDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Infer role and optional userId from a LiveKit identity string. */
function parseIdentity(identity: string): { role: string; userId: string | null } {
  if (identity.startsWith("student_")) {
    return { role: "student", userId: identity.slice("student_".length) };
  }
  if (identity.startsWith("host_")) {
    return { role: "host", userId: identity.slice("host_".length) };
  }
  return { role: "guest", userId: null };
}

/**
 * Resolve a student identity to a Registration for the given LiveSession.
 * Returns null if any link in the chain is missing.
 */
async function resolveStudentRegistration(
  identity: string,
  courseSessionId: string
): Promise<{ registrationId: string } | null> {
  if (!identity.startsWith("student_")) return null;

  const userId = identity.slice("student_".length);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return null;

  const student = await prisma.student.findFirst({
    where: { email: user.email },
    select: { id: true },
  });
  if (!student) return null;

  const registration = await prisma.registration.findFirst({
    where: {
      studentId: student.id,
      sessionId: courseSessionId,
      status: { in: ["CONFIRMED", "ATTENDING", "PENDING"] },
    },
    select: { id: true },
  });
  if (!registration) return null;

  return { registrationId: registration.id };
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleParticipantJoined(
  roomName: string | undefined,
  identity: string | undefined,
  displayName: string | undefined,
  numParticipants: number
): Promise<void> {
  if (!roomName || !identity) return;

  const liveSession = await prisma.liveSession.findUnique({
    where: { roomName },
    select: { id: true, courseSessionId: true },
  });
  if (!liveSession) return;

  const now = new Date();
  const { role, userId } = parseIdentity(identity);

  // Check if this is a first join or a reconnect before upserting.
  const existingParticipant = await prisma.liveSessionParticipant.findUnique({
    where: { liveSessionId_identity: { liveSessionId: liveSession.id, identity } },
    select: { id: true },
  });
  const isFirstJoin = !existingParticipant;

  await prisma.liveSessionParticipant.upsert({
    where: { liveSessionId_identity: { liveSessionId: liveSession.id, identity } },
    create: {
      liveSessionId: liveSession.id,
      userId,
      identity,
      displayName: displayName ?? identity,
      role,
      joinedAt: now,
      lastJoinedAt: now,
    },
    update: {
      // On reconnect: refresh segment tracker; preserve original joinedAt.
      lastJoinedAt: now,
      leftAt: null,
    },
  });

  // Attendance + session counters — students only.
  if (identity.startsWith("student_")) {
    const resolved = await resolveStudentRegistration(
      identity,
      liveSession.courseSessionId
    );

    if (resolved) {
      const sessionDate = toSessionDate(now);

      await prisma.attendance.upsert({
        where: {
          registrationId_sessionDate: {
            registrationId: resolved.registrationId,
            sessionDate,
          },
        },
        create: {
          registrationId: resolved.registrationId,
          sessionId: liveSession.courseSessionId,
          sessionDate,
          status: "PRESENT",
          checkInMethod: "livekit",
          joinedAt: now,
          lastJoinedAt: now,
        },
        update: {
          status: "PRESENT",
          lastJoinedAt: now,
        },
      });

      // 30.1 — CONFIRMED → ATTENDING on first join.
      if (isFirstJoin) {
        await prisma.registration.updateMany({
          where: { id: resolved.registrationId, status: "CONFIRMED" },
          data: { status: "ATTENDING" },
        });
      }
    }

    // Only increment totalJoins on the first join — reconnects don't count.
    await prisma.liveSession.update({
      where: { id: liveSession.id },
      data: {
        ...(isFirstJoin && { totalJoins: { increment: 1 } }),
        peakParticipants: { set: Math.max(numParticipants, 0) },
      },
    });
  }
}

async function handleParticipantLeft(
  roomName: string | undefined,
  identity: string | undefined
): Promise<void> {
  if (!roomName || !identity) return;

  const liveSession = await prisma.liveSession.findUnique({
    where: { roomName },
    select: { id: true, courseSessionId: true },
  });
  if (!liveSession) return;

  const now = new Date();

  // Update participant row for ALL participants.
  const participant = await prisma.liveSessionParticipant.findUnique({
    where: { liveSessionId_identity: { liveSessionId: liveSession.id, identity } },
    select: { id: true, totalDurationSeconds: true, lastJoinedAt: true, leftAt: true },
  });

  if (participant) {
    // Idempotency: if leftAt is already set, this leave event was already processed.
    if (participant.leftAt) return;

    const segmentSeconds = participant.lastJoinedAt
      ? Math.floor((now.getTime() - participant.lastJoinedAt.getTime()) / 1000)
      : 0;
    await prisma.liveSessionParticipant.update({
      where: { id: participant.id },
      data: {
        leftAt: now,
        totalDurationSeconds: participant.totalDurationSeconds + segmentSeconds,
        lastJoinedAt: null,
      },
    });
  }

  // Attendance duration — students only.
  if (identity.startsWith("student_")) {
    const resolved = await resolveStudentRegistration(
      identity,
      liveSession.courseSessionId
    );
    if (!resolved) return;

    const sessionDate = toSessionDate(now);
    const existing = await prisma.attendance.findUnique({
      where: {
        registrationId_sessionDate: {
          registrationId: resolved.registrationId,
          sessionDate,
        },
      },
      select: { id: true, durationSeconds: true, lastJoinedAt: true, leftAt: true },
    });

    if (!existing) return;

    // Idempotency: if leftAt is already set, duration was already accumulated.
    if (existing.leftAt) return;

    const segmentSeconds = existing.lastJoinedAt
      ? Math.floor((now.getTime() - existing.lastJoinedAt.getTime()) / 1000)
      : 0;

    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        leftAt: now,
        durationSeconds: existing.durationSeconds + segmentSeconds,
        lastJoinedAt: null,
      },
    });
  }
}

async function handleRoomFinished(roomName: string | undefined): Promise<void> {
  if (!roomName) return;

  // Only transition from states that the machine allows → ENDED.
  await prisma.liveSession.updateMany({
    where: {
      roomName,
      status: { in: ["LIVE", "WAITING"] }, // valid ENDED predecessors
    },
    data: { status: "ENDED", endedAt: new Date() },
  });
}

async function handleEgressEnded(
  egressId: string | undefined,
  fileLocation: string | undefined
): Promise<void> {
  if (!egressId) return;

  const updated = await prisma.liveSession.findFirst({
    where: { egressId },
    select: {
      id: true,
      hostId: true,
      courseSessionId: true,
      courseSession: { select: { course: { select: { name: true, slug: true } } } },
    },
  });

  // Clear the egressId and store the recording URL.
  // Only advance to COMPLETED from valid predecessor states (RECORDING_PROCESSING, ENDED).
  await prisma.liveSession.updateMany({
    where: {
      egressId,
      status: { in: ["RECORDING_PROCESSING", "ENDED"] }, // valid COMPLETED predecessors
    },
    data: {
      egressId: null,
      recordingUrl: fileLocation ?? null,
      status: "COMPLETED",
    },
  });

  // Notify the host that the recording is ready.
  if (updated?.hostId && fileLocation) {
    enqueueNotification(
      NotificationTypes.LIVE_SESSION_RECORDING_READY,
      updated.hostId,
      {
        title: "Recording is ready",
        body: updated.courseSession.course.name,
        courseName: updated.courseSession.course.name,
        courseSlug: updated.courseSession.course.slug,
        courseSessionId: updated.courseSessionId,
      },
      {
        entityType: "LiveSession",
        entityId: updated.id,
        dedupWindowHours: 0,
      },
    ).catch((e) => console.error("[Webhook] failed to enqueue recording-ready notification:", e));
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  // LiveKit sends the JWT signature in the "Authorization" header.
  const authHeader =
    req.headers.get("Authorization") ??
    req.headers.get("Authorize") ??
    undefined;

  let event;
  try {
    event = await receiver.receive(body, authHeader);
  } catch (e) {
    console.error("[LK Webhook] signature verification failed:", e);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = event.id;
  const eventType = event.event ?? "unknown";
  const roomName = event.room?.name;
  const identity = event.participant?.identity;

  // ── 20.3 Deduplication ────────────────────────────────────────────────────
  // Attempt to insert the event ID. A unique-constraint violation means
  // LiveKit retried a previously processed event — return 200 immediately.
  if (eventId) {
    try {
      await prisma.processedWebhookEvent.create({
        data: { id: eventId, event: eventType },
      });
    } catch {
      // Already processed — acknowledge without re-processing.
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  // ── 20.4 Enriched error context ───────────────────────────────────────────
  const logCtx = { eventId, eventType, roomName, identity };

  try {
    switch (eventType) {
      case "participant_joined":
        await handleParticipantJoined(
          roomName,
          identity,
          event.participant?.name,
          event.room?.numParticipants ?? 0
        );
        break;

      case "participant_left":
        await handleParticipantLeft(roomName, identity);
        break;

      case "room_finished":
        await handleRoomFinished(roomName);
        break;

      case "egress_ended":
        await handleEgressEnded(
          event.egressInfo?.egressId,
          event.egressInfo?.fileResults?.[0]?.location
        );
        break;
    }
  } catch (e) {
    // Return 200 regardless — LiveKit retries on non-2xx which would bypass
    // the dedup guard and reprocess. Log with full context and investigate.
    console.error("[LK Webhook] handler error", { ...logCtx, error: e });
  }

  return NextResponse.json({ ok: true });
}
