"use server";

import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { hasPermission } from "@/lib/permissions";
import { generateHostToken, generateStudentToken, generateObserverToken } from "@/lib/livekit/token";
import { getValidatedLivekitUrl } from "@/lib/livekit/config";
import { assertTransition, transitionErrorMessage } from "@/lib/livekit/state-machine";
import {
  grantSpeaking,
  revokeSpeaking,
  admitParticipant,
  rejectParticipant,
  muteTrack,
  muteAllStudents,
  removeParticipant,
} from "@/lib/livekit/room-service";
import { startRoomRecording, stopRoomRecording } from "@/lib/livekit/egress";
import { generateSignedUrl } from "@/lib/storage/s3";
import { revalidatePath } from "next/cache";
import { enqueueNotification } from "@/lib/notifications/enqueue";
import { NotificationTypes } from "@/lib/notifications/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type ChatMessage = {
  id: string;
  senderIdentity: string;
  senderName: string;
  senderRole: string;
  body: string;
  sentAt: Date;
};

export type LiveSessionRow = {
  id: string;
  roomName: string;
  status: string;
  locked: boolean;
  egressId: string | null;
  recordingUrl: string | null;
  whiteboardSnapshot: unknown;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  peakParticipants: number;
  totalJoins: number;
  hostId: string | null;
};

function computeSessionTtl(endDate: Date | null | undefined): string {
  if (!endDate) return "4h";
  const hoursLeft = (endDate.getTime() - Date.now()) / 3_600_000;
  const clamped = Math.max(2, Math.min(8, Math.ceil(hoursLeft) + 1));
  return `${clamped}h`;
}

function generateRoomName(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return (
    "live-" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

// ─── Queries ──────────────────────────────────────────────────────────────────

const LIVE_SESSION_SELECT = {
  id: true,
  roomName: true,
  status: true,
  locked: true,
  egressId: true,
  recordingUrl: true,
  whiteboardSnapshot: true,
  scheduledAt: true,
  startedAt: true,
  endedAt: true,
  peakParticipants: true,
  totalJoins: true,
  hostId: true,
} as const;

const TERMINAL_STATUSES = ["ENDED", "COMPLETED", "CANCELLED"] as const;

// Returns the most recent active (non-terminal) LiveSession for a CourseSession,
// or the most recent terminal one if none is active (so the UI always shows something).
export async function getLiveSession(
  courseSessionId: string
): Promise<LiveSessionRow | null> {
  await requirePermissionAction("live.view");
  const active = await prisma.liveSession.findFirst({
    where: { courseSessionId, status: { notIn: [...TERMINAL_STATUSES] } },
    orderBy: { createdAt: "desc" },
    select: LIVE_SESSION_SELECT,
  });
  if (active) return active;
  return prisma.liveSession.findFirst({
    where: { courseSessionId },
    orderBy: { createdAt: "desc" },
    select: LIVE_SESSION_SELECT,
  });
}

// 32.1 — All LiveSessions for a CourseSession ordered newest first (for timeline view).
export async function getAllLiveSessions(
  courseSessionId: string
): Promise<LiveSessionRow[]> {
  await requirePermissionAction("live.view");
  return prisma.liveSession.findMany({
    where: { courseSessionId },
    orderBy: { createdAt: "desc" },
    select: LIVE_SESSION_SELECT,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createLiveSession(
  courseSessionId: string,
  courseSlug: string
): Promise<Result<LiveSessionRow>> {
  const auth = await requirePermissionAction("live.host");

  try {
    const [existing, courseSession] = await Promise.all([
      // Only return an existing session if it is still active (not terminal).
      prisma.liveSession.findFirst({
        where: { courseSessionId, status: { notIn: [...TERMINAL_STATUSES] } },
        orderBy: { createdAt: "desc" },
        select: LIVE_SESSION_SELECT,
      }),
      prisma.courseSession.findUnique({
        where: { id: courseSessionId },
        select: { startDate: true },
      }),
    ]);
    if (existing) return { ok: true, data: existing };

    const ls = await prisma.liveSession.create({
      data: {
        courseSessionId,
        roomName: generateRoomName(),
        hostId: auth.user.id,
        status: "SCHEDULED",
        scheduledAt: courseSession?.startDate ?? null,
      },
      select: LIVE_SESSION_SELECT,
    });

    revalidatePath(`/courses/${courseSlug}/sessions/${courseSessionId}`);
    return { ok: true, data: ls };
  } catch (e) {
    console.error("[LiveSession] create failed:", e);
    return { ok: false, error: "Failed to create live session." };
  }
}

async function notifyEnrolledStudents(
  liveSessionId: string,
  courseSessionId: string,
  courseName: string,
  courseSlug: string,
  sessionId: string,
): Promise<void> {
  const registrations = await prisma.registration.findMany({
    where: { sessionId: courseSessionId, status: { in: ["CONFIRMED", "ATTENDING"] } },
    select: { student: { select: { email: true } } },
  });

  const emails = registrations
    .map((r) => r.student.email)
    .filter((e): e is string => !!e);
  if (!emails.length) return;

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });

  await Promise.all(
    users.map((u) =>
      enqueueNotification(
        NotificationTypes.LIVE_SESSION_STUDENT_JOIN,
        u.id,
        { title: "Your live class has started", body: courseName, courseName, courseSlug, courseSessionId: sessionId },
        { entityType: "LiveSession", entityId: `studentJoin:${liveSessionId}`, dedupWindowHours: 1 },
      ).catch((e) => console.error("[LiveSession] failed to notify student:", u.id, e))
    )
  );
}

export async function goLive(
  liveSessionId: string,
  courseSlug: string,
  courseSessionId: string
): Promise<Result<{ token: string; url: string; roomName: string }>> {
  const auth = await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: {
        roomName: true,
        status: true,
        startedAt: true,
        courseSession: {
          select: { endDate: true, course: { select: { name: true } } },
        },
      },
    });
    if (!ls) return { ok: false, error: "Live session not found." };

    const url = getValidatedLivekitUrl();

    if (ls.status !== "LIVE") {
      try {
        assertTransition(ls.status, "LIVE");
      } catch {
        return { ok: false, error: transitionErrorMessage(ls.status, "LIVE") };
      }
      await prisma.liveSession.update({
        where: { id: liveSessionId },
        data: {
          status: "LIVE",
          startedAt: ls.startedAt ?? new Date(),
          hostId: auth.user.id,
        },
      });

      // Fire-and-forget: notify the host that their session is live.
      enqueueNotification(
        NotificationTypes.LIVE_SESSION_STARTED,
        auth.user.id,
        {
          title: "Live session started",
          body: ls.courseSession.course.name,
          courseName: ls.courseSession.course.name,
          courseSlug,
          courseSessionId,
        },
        {
          entityType: "LiveSession",
          entityId: `started:${liveSessionId}`,
          dedupWindowHours: 1,
        },
      ).catch((e) => console.error("[LiveSession] failed to enqueue started notification:", e));

      // 29.1 — Fire-and-forget: notify enrolled students that the session is live.
      notifyEnrolledStudents(liveSessionId, courseSessionId, ls.courseSession.course.name, courseSlug, courseSessionId)
        .catch((e) => console.error("[LiveSession] failed to notify enrolled students:", e));
    }

    const identity = `host_${auth.user.id}`;
    const name = auth.user.name ?? "Host";
    const ttl = computeSessionTtl(ls.courseSession.endDate);
    const token = await generateHostToken(identity, name, ls.roomName, ttl);

    revalidatePath(`/courses/${courseSlug}/sessions/${courseSessionId}`);
    return { ok: true, data: { token, url, roomName: ls.roomName } };
  } catch (e) {
    console.error("[LiveSession] go-live failed:", e);
    return { ok: false, error: "Failed to start live session." };
  }
}

// 26.1 — Summary returned immediately after ending a session.
export type SessionEndSummary = {
  durationSeconds: number | null;
  totalJoins: number;
  peakParticipants: number;
  registered: number;
  attendancePct: number;
  attendanceSynced: number;
};

export async function endLiveSession(
  liveSessionId: string,
  courseSlug: string,
  courseSessionId: string
): Promise<Result<{ status: "ENDED" | "RECORDING_PROCESSING"; summary: SessionEndSummary }>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: {
        status: true,
        egressId: true,
        startedAt: true,
        totalJoins: true,
        peakParticipants: true,
        courseSessionId: true,
        hostId: true,
        courseSession: { select: { course: { select: { name: true } } } },
      },
    });
    if (!ls) return { ok: false, error: "Live session not found." };

    // 22.4 — auto-stop active recording so the session doesn't end mid-egress.
    if (ls.egressId) {
      try {
        await stopRoomRecording(ls.egressId);
      } catch (e) {
        console.error("[LiveSession] auto-stop recording on end failed:", e);
      }
    }

    const nextStatus: "ENDED" | "RECORDING_PROCESSING" = ls.egressId
      ? "RECORDING_PROCESSING"
      : "ENDED";

    try {
      assertTransition(ls.status, nextStatus);
    } catch {
      return { ok: false, error: transitionErrorMessage(ls.status, nextStatus) };
    }

    const endedAt = new Date();

    // Gather summary stats in parallel with the status update.
    const [, registered, studentParticipants] = await Promise.all([
      prisma.liveSession.update({
        where: { id: liveSessionId },
        data: {
          status: nextStatus,
          endedAt,
          ...(ls.egressId ? { egressId: null } : {}),
        },
      }),
      prisma.registration.count({
        where: {
          sessionId: ls.courseSessionId,
          status: { in: ["CONFIRMED", "ATTENDING", "COMPLETED", "PENDING"] },
        },
      }),
      prisma.liveSessionParticipant.findMany({
        where: { liveSessionId, role: "student", userId: { not: null }, totalDurationSeconds: { gt: 0 } },
        select: { userId: true },
      }),
    ]);

    // 26.2 — Auto-attendance sync: CONFIRMED → ATTENDING for students who joined.
    let attendanceSynced = 0;
    if (studentParticipants.length > 0) {
      try {
        const userIds = studentParticipants.map((p) => p.userId!);
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { email: true },
        });
        const emails = users.map((u) => u.email).filter(Boolean) as string[];
        if (emails.length > 0) {
          const students = await prisma.student.findMany({
            where: { email: { in: emails } },
            select: { id: true },
          });
          const studentIds = students.map((s) => s.id);
          if (studentIds.length > 0) {
            // 30.2 — CONFIRMED/ATTENDING → COMPLETED for students who joined.
            const { count } = await prisma.registration.updateMany({
              where: { studentId: { in: studentIds }, sessionId: ls.courseSessionId, status: { in: ["CONFIRMED", "ATTENDING"] } },
              data: { status: "COMPLETED" },
            });
            attendanceSynced = count;
          }
        }
      } catch (e) {
        console.error("[LiveSession] attendance finalization failed:", e);
      }
    }

    // 30.3 — No-show detection: remaining CONFIRMED = didn't join at all.
    if (ls.hostId) {
      try {
        const noShows = await prisma.registration.findMany({
          where: { sessionId: ls.courseSessionId, status: "CONFIRMED" },
          select: { id: true, student: { select: { firstName: true, lastName: true } } },
          take: 50,
        });
        const sessionDate = ls.startedAt
          ? ls.startedAt.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        for (const reg of noShows) {
          const studentName = reg.student
            ? [reg.student.firstName, reg.student.lastName].filter(Boolean).join(" ") || "Student"
            : "Student";
          enqueueNotification(
            NotificationTypes.ATTENDANCE_NO_SHOW,
            ls.hostId,
            {
              studentName,
              courseName: ls.courseSession.course.name,
              sessionDate,
              courseSlug,
            },
            { entityType: "Registration", entityId: reg.id, dedupWindowHours: 0 },
          ).catch((e) => console.error("[LiveSession] no-show notification failed:", e));
        }
      } catch (e) {
        console.error("[LiveSession] no-show detection failed:", e);
      }
    }

    const joined = studentParticipants.length;
    const durationSeconds = ls.startedAt
      ? Math.round((endedAt.getTime() - ls.startedAt.getTime()) / 1000)
      : null;

    const summary: SessionEndSummary = {
      durationSeconds,
      totalJoins: ls.totalJoins,
      peakParticipants: ls.peakParticipants,
      registered,
      attendancePct: registered > 0 ? Math.round((joined / registered) * 100) : 0,
      attendanceSynced,
    };

    revalidatePath(`/courses/${courseSlug}/sessions/${courseSessionId}`);
    return { ok: true, data: { status: nextStatus, summary } };
  } catch (e) {
    console.error("[LiveSession] end failed:", e);
    return { ok: false, error: "Failed to end live session." };
  }
}

export async function cancelLiveSession(
  liveSessionId: string,
  courseSlug: string,
  courseSessionId: string
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    try {
      assertTransition(ls.status, "CANCELLED");
    } catch {
      return { ok: false, error: transitionErrorMessage(ls.status, "CANCELLED") };
    }

    await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: { status: "CANCELLED" },
    });

    revalidatePath(`/courses/${courseSlug}/sessions/${courseSessionId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] cancel failed:", e);
    return { ok: false, error: "Failed to cancel live session." };
  }
}

// 32.2 — Re-run a cancelled/ended/completed LiveSession by creating a fresh one.
// The old session is preserved for historical data (participants, chat, polls).
export async function reRunLiveSession(
  courseSessionId: string,
  courseSlug: string
): Promise<Result<LiveSessionRow>> {
  const auth = await requirePermissionAction("live.host");

  try {
    // Verify there is no active (non-terminal) session already.
    const active = await prisma.liveSession.findFirst({
      where: { courseSessionId, status: { notIn: [...TERMINAL_STATUSES] } },
      select: { id: true, status: true },
    });
    if (active) {
      return { ok: false, error: "A live session is already active for this course session." };
    }

    const courseSession = await prisma.courseSession.findUnique({
      where: { id: courseSessionId },
      select: { startDate: true },
    });

    const ls = await prisma.liveSession.create({
      data: {
        courseSessionId,
        roomName: generateRoomName(),
        hostId: auth.user.id,
        status: "SCHEDULED",
        scheduledAt: courseSession?.startDate ?? null,
      },
      select: LIVE_SESSION_SELECT,
    });

    revalidatePath(`/courses/${courseSlug}/sessions/${courseSessionId}`);
    return { ok: true, data: ls };
  } catch (e) {
    console.error("[LiveSession] re-run failed:", e);
    return { ok: false, error: "Failed to create a new live session." };
  }
}

// ─── Phase 2–3: Role-gated tokens, authorization & speaking permissions ───────

/**
 * Generate a subscribe-only student token for an authorized CRM user.
 * Full student authorization (enrollment check) is Phase 3.
 */
export async function joinAsObserver(
  liveSessionId: string
): Promise<Result<{ token: string; url: string; roomName: string }>> {
  const auth = await requirePermissionAction("live.view");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { roomName: true, status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (ls.status !== "LIVE" && ls.status !== "WAITING") {
      return { ok: false, error: "Session is not currently live." };
    }

    const url = getValidatedLivekitUrl();

    const identity = `obs_${auth.user.id}`;
    const name = auth.user.name ?? "Observer";
    // 28.3 — Use hidden token so the observer doesn't appear in participant count.
    const token = await generateObserverToken(identity, name, ls.roomName);

    return { ok: true, data: { token, url, roomName: ls.roomName } };
  } catch (e) {
    console.error("[LiveSession] observer token failed:", e);
    return { ok: false, error: "Failed to join session." };
  }
}

/**
 * Phase 3.1 — Join a live session as an enrolled student.
 * Verifies the authenticated user is linked to an active Registration
 * for this CourseSession before issuing a subscribe-only token.
 * Room name is resolved server-side — never from browser params.
 */
export async function joinAsEnrolledStudent(
  liveSessionId: string
): Promise<Result<{ token: string; url: string; roomName: string }>> {
  const auth = await requirePermissionAction("live.view");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: {
        roomName: true,
        status: true,
        locked: true,
        courseSessionId: true,
        courseSession: {
          select: { course: { select: { slug: true } } },
        },
      },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (ls.status !== "LIVE" && ls.status !== "WAITING") {
      return { ok: false, error: "Session is not currently live." };
    }
    if (ls.locked) {
      return { ok: false, error: "The classroom is currently locked. Please wait for the trainer to unlock it." };
    }

    const url = getValidatedLivekitUrl();

    // Phase 3.2 guard — room identity comes from DB, never from the request.
    // The liveSessionId was already resolved to roomName above; no way for the
    // browser to substitute a different room.

    // Phase 3.3 — verify enrollment if the user has a linked student record.
    const instructor = await prisma.instructor.findUnique({
      where: { userId: auth.user.id },
      select: { id: true },
    });
    const isTrainer = !!instructor || ["ADMIN", "MANAGER", "TRAINER"].includes(auth.user.role ?? "");

    if (!isTrainer) {
      // Check enrollment via the Student linked to this User's email.
      const student = await prisma.student.findFirst({
        where: { email: auth.user.email ?? "__none__" },
        select: { id: true },
      });
      if (student) {
        const registration = await prisma.registration.findFirst({
          where: {
            studentId: student.id,
            sessionId: ls.courseSessionId,
            status: { in: ["CONFIRMED", "ATTENDING", "PENDING"] },
          },
          select: { id: true },
        });
        if (!registration) {
          return {
            ok: false,
            error: "You are not enrolled in this session.",
          };
        }
      }
      // If no student record exists for this user, they are a CRM employee —
      // allow them to observe (subscribe-only) without enrollment check.
    }

    const identity = isTrainer ? `host_${auth.user.id}` : `student_${auth.user.id}`;
    const name = auth.user.name ?? "Participant";
    const token = isTrainer
      ? await generateHostToken(identity, name, ls.roomName)
      : await generateStudentToken(identity, name, ls.roomName);

    return { ok: true, data: { token, url, roomName: ls.roomName } };
  } catch (e) {
    console.error("[LiveSession] student join failed:", e);
    return { ok: false, error: "Failed to join session." };
  }
}

/**
 * Grant speaking (canPublish) to a participant — trainer action.
 * Participant identity is the LiveKit identity string (e.g. "guest_abc123").
 */
export async function grantSpeakingPermission(
  liveSessionId: string,
  participantIdentity: string
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { roomName: true, status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (ls.status !== "LIVE") return { ok: false, error: "Session is not live." };

    await grantSpeaking(ls.roomName, participantIdentity);
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] grant speaking failed:", e);
    return { ok: false, error: "Failed to grant speaking permission." };
  }
}

/**
 * Phase 4 — Admit a student from the waiting room.
 * Updates participant metadata to {"status":"admitted"} server-side;
 * the client detects the MetadataChanged event and reveals the room.
 */
export async function admitWaitingParticipant(
  liveSessionId: string,
  participantIdentity: string
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { roomName: true, status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (ls.status !== "LIVE") return { ok: false, error: "Session is not live." };

    await admitParticipant(ls.roomName, participantIdentity);
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] admit participant failed:", e);
    return { ok: false, error: "Failed to admit participant." };
  }
}

/**
 * Phase 4 — Reject (remove) a student from the waiting room.
 */
export async function rejectWaitingParticipant(
  liveSessionId: string,
  participantIdentity: string
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { roomName: true, status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (ls.status !== "LIVE") return { ok: false, error: "Session is not live." };

    await rejectParticipant(ls.roomName, participantIdentity);
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] reject participant failed:", e);
    return { ok: false, error: "Failed to reject participant." };
  }
}

/**
 * Revoke speaking (canPublish) from a participant — trainer action.
 */
export async function revokeSpeakingPermission(
  liveSessionId: string,
  participantIdentity: string
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { roomName: true, status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };

    await revokeSpeaking(ls.roomName, participantIdentity);
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] revoke speaking failed:", e);
    return { ok: false, error: "Failed to revoke speaking permission." };
  }
}

// ─── Phase 5: Trainer Moderation ─────────────────────────────────────────────

/**
 * 5.1 — Mute or unmute a specific published audio/video track.
 * trackSid is provided by the client from the LiveKit participant object.
 */
export async function muteParticipantTrack(
  liveSessionId: string,
  participantIdentity: string,
  trackSid: string,
  muted: boolean
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { roomName: true, status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (ls.status !== "LIVE") return { ok: false, error: "Session is not live." };

    await muteTrack(ls.roomName, participantIdentity, trackSid, muted);
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] mute track failed:", e);
    return { ok: false, error: "Failed to mute track." };
  }
}

/**
 * 5.1 — Remove (kick) a participant from the room immediately.
 */
export async function kickParticipant(
  liveSessionId: string,
  participantIdentity: string
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { roomName: true, status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (ls.status !== "LIVE") return { ok: false, error: "Session is not live." };

    await removeParticipant(ls.roomName, participantIdentity);
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] kick participant failed:", e);
    return { ok: false, error: "Failed to remove participant." };
  }
}

/**
 * 5.2 — Mute all student audio tracks in the room server-side.
 */
export async function muteAllParticipants(
  liveSessionId: string
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { roomName: true, status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (ls.status !== "LIVE") return { ok: false, error: "Session is not live." };

    await muteAllStudents(ls.roomName);
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] mute all failed:", e);
    return { ok: false, error: "Failed to mute all participants." };
  }
}

/**
 * 5.4 — Toggle the classroom lock. When locked, new participants cannot join.
 * Returns the new locked state so the client can update its UI.
 */
export async function toggleRoomLock(
  liveSessionId: string
): Promise<Result<{ locked: boolean }>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { locked: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };

    const updated = await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: { locked: !ls.locked },
      select: { locked: true },
    });
    return { ok: true, data: { locked: updated.locked } };
  } catch (e) {
    console.error("[LiveSession] toggle lock failed:", e);
    return { ok: false, error: "Failed to update room lock." };
  }
}

// ─── Phase 7: Server-Side Recording ──────────────────────────────────────────

/**
 * 7.2 — Start a RoomCompositeEgress recording via LiveKit Egress.
 * Stores egressId on LiveSession for later stop/status tracking.
 */
export async function startRecording(
  liveSessionId: string
): Promise<Result<{ egressId: string }>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { roomName: true, status: true, egressId: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (ls.status !== "LIVE") return { ok: false, error: "Session is not live." };
    if (ls.egressId) return { ok: false, error: "Recording is already in progress." };

    const { egressId } = await startRoomRecording(ls.roomName);

    await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: { egressId },
    });

    return { ok: true, data: { egressId } };
  } catch (e) {
    console.error("[LiveSession] start recording failed:", e);
    return { ok: false, error: "Failed to start recording. Make sure the Egress service is running." };
  }
}

/**
 * 7.3 — Stop the active recording and transition status to RECORDING_PROCESSING.
 */
export async function stopRecording(
  liveSessionId: string
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { egressId: true, status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (!ls.egressId) return { ok: false, error: "No recording in progress." };
    try {
      assertTransition(ls.status, "RECORDING_PROCESSING");
    } catch {
      return { ok: false, error: transitionErrorMessage(ls.status, "RECORDING_PROCESSING") };
    }

    await stopRoomRecording(ls.egressId);

    await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: { status: "RECORDING_PROCESSING", egressId: null },
    });

    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] stop recording failed:", e);
    return { ok: false, error: "Failed to stop recording." };
  }
}

// ─── Phase 8: Recording Storage & Replay ─────────────────────────────────────

/**
 * 8.2/8.3 — Generate a time-limited signed URL for the session recording.
 * Trainers/admins (live.host) have unconditional access.
 * Students must have an active registration for the course session.
 */
export async function getRecordingUrl(
  liveSessionId: string
): Promise<Result<{ url: string }>> {
  const auth = await requirePermissionAction("live.view");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: {
        recordingUrl: true,
        status: true,
        courseSessionId: true,
      },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (!ls.recordingUrl) {
      return { ok: false, error: "No recording available for this session." };
    }

    // Trainers/admins skip enrollment check.
    const canHost = hasPermission(auth.user.role, "live.host");
    if (!canHost) {
      const student = await prisma.student.findFirst({
        where: { email: auth.user.email ?? "__none__" },
        select: { id: true },
      });
      if (student) {
        const registration = await prisma.registration.findFirst({
          where: {
            studentId: student.id,
            sessionId: ls.courseSessionId,
            status: { in: ["CONFIRMED", "ATTENDING", "COMPLETED", "PENDING"] },
          },
          select: { id: true },
        });
        if (!registration) {
          return {
            ok: false,
            error: "You are not authorized to view this recording.",
          };
        }
      }
    }

    const url = await generateSignedUrl(ls.recordingUrl);
    return { ok: true, data: { url } };
  } catch (e) {
    console.error("[LiveSession] get recording URL failed:", e);
    return { ok: false, error: "Failed to generate recording URL." };
  }
}

// ─── Phase 10: Whiteboard Persistence ────────────────────────────────────────

/**
 * 10.1 — Persist the tldraw snapshot to the LiveSession record.
 * Called by the host's WhiteboardPanel on a throttled basis (every ~10 s).
 */
export async function saveWhiteboardSnapshot(
  liveSessionId: string,
  snapshot: object
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: { whiteboardSnapshot: snapshot },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[Whiteboard] save snapshot failed:", e);
    return { ok: false, error: "Failed to save whiteboard state." };
  }
}

// ─── Phase 9: Persistent Chat ─────────────────────────────────────────────────

const CHAT_MSG_SELECT = {
  id: true,
  senderIdentity: true,
  senderName: true,
  senderRole: true,
  body: true,
  sentAt: true,
} as const;

/**
 * 9.2 — Persist a chat message sent via the LiveKit data channel.
 * Called fire-and-forget by the client immediately after broadcasting.
 */
export async function sendChatMessage(
  liveSessionId: string,
  body: string
): Promise<Result<ChatMessage>> {
  const auth = await requirePermissionAction("live.view");

  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 2000) {
    return { ok: false, error: "Message must be 1–2000 characters." };
  }

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { status: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };
    if (ls.status !== "LIVE" && ls.status !== "WAITING") {
      return { ok: false, error: "Session is not currently live." };
    }

    const canHost = hasPermission(auth.user.role, "live.host");
    const senderRole = canHost ? "host" : "student";
    const senderIdentity = canHost
      ? `host_${auth.user.id}`
      : `student_${auth.user.id}`;

    const msg = await prisma.liveMessage.create({
      data: {
        liveSessionId,
        senderIdentity,
        senderName: auth.user.name ?? "Participant",
        senderRole,
        body: trimmed,
      },
      select: CHAT_MSG_SELECT,
    });

    return { ok: true, data: msg };
  } catch (e) {
    console.error("[LiveSession] send chat message failed:", e);
    return { ok: false, error: "Failed to send message." };
  }
}

/**
 * 9.3 — Load the last N chat messages for history on join.
 * Available to any authenticated user with live.view (same gate as joining).
 */
export async function getChatHistory(
  liveSessionId: string,
  limit = 50
): Promise<Result<ChatMessage[]>> {
  await requirePermissionAction("live.view");

  try {
    const messages = await prisma.liveMessage.findMany({
      where: { liveSessionId },
      orderBy: { sentAt: "asc" },
      take: limit,
      select: CHAT_MSG_SELECT,
    });
    return { ok: true, data: messages };
  } catch (e) {
    console.error("[LiveSession] get chat history failed:", e);
    return { ok: false, error: "Failed to load chat history." };
  }
}

// ── Participant tracking ───────────────────────────────────────────────────────

export type SessionParticipant = {
  id: string;
  identity: string;
  displayName: string;
  role: string;
  joinedAt: Date;
  leftAt: Date | null;
  totalDurationSeconds: number;
};

export async function getSessionParticipants(
  liveSessionId: string
): Promise<Result<SessionParticipant[]>> {
  await requirePermissionAction("live.host");

  try {
    const rows = await prisma.liveSessionParticipant.findMany({
      where: { liveSessionId },
      orderBy: { joinedAt: "asc" },
      select: {
        id: true,
        identity: true,
        displayName: true,
        role: true,
        joinedAt: true,
        leftAt: true,
        totalDurationSeconds: true,
      },
    });
    return { ok: true, data: rows };
  } catch (e) {
    console.error("[LiveSession] get participants failed:", e);
    return { ok: false, error: "Failed to load participants." };
  }
}

// ── Polls ──────────────────────────────────────────────────────────────────────

export type PollWithResults = {
  id: string;
  question: string;
  options: string[];
  status: string;
  createdAt: Date;
  closedAt: Date | null;
  results: { option: string; count: number }[];
  totalVotes: number;
};

export async function createPoll(
  liveSessionId: string,
  question: string,
  options: string[]
): Promise<Result<{ id: string; question: string; options: string[] }>> {
  const auth = await requirePermissionAction("live.host");

  try {
    const poll = await prisma.livePoll.create({
      data: { liveSessionId, question, options, createdById: auth.user.id },
      select: { id: true, question: true, options: true },
    });
    return { ok: true, data: { ...poll, options: poll.options as string[] } };
  } catch (e) {
    console.error("[LiveSession] create poll failed:", e);
    return { ok: false, error: "Failed to create poll." };
  }
}

export async function submitPollVote(
  pollId: string,
  voterIdentity: string,
  option: string
): Promise<Result<void>> {
  await requirePermissionAction("live.view");

  try {
    await prisma.livePollVote.upsert({
      where: { pollId_voterIdentity: { pollId, voterIdentity } },
      create: { pollId, voterIdentity, option },
      update: { option },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] submit poll vote failed:", e);
    return { ok: false, error: "Failed to submit vote." };
  }
}

export async function closePoll(pollId: string): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    await prisma.livePoll.update({
      where: { id: pollId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] close poll failed:", e);
    return { ok: false, error: "Failed to close poll." };
  }
}

export async function getSessionPolls(
  liveSessionId: string
): Promise<Result<PollWithResults[]>> {
  await requirePermissionAction("live.host");

  try {
    const polls = await prisma.livePoll.findMany({
      where: { liveSessionId },
      orderBy: { createdAt: "asc" },
      include: { votes: { select: { option: true } } },
    });

    const data: PollWithResults[] = polls.map((poll) => {
      const options = poll.options as string[];
      const tally: Record<string, number> = Object.fromEntries(
        options.map((o) => [o, 0])
      );
      for (const vote of poll.votes) {
        if (vote.option in tally) tally[vote.option]++;
      }
      return {
        id: poll.id,
        question: poll.question,
        options,
        status: poll.status,
        createdAt: poll.createdAt,
        closedAt: poll.closedAt,
        results: options.map((o) => ({ option: o, count: tally[o] })),
        totalVotes: poll.votes.length,
      };
    });

    return { ok: true, data };
  } catch (e) {
    console.error("[LiveSession] get session polls failed:", e);
    return { ok: false, error: "Failed to load polls." };
  }
}

// ── Q&A ────────────────────────────────────────────────────────────────────────

export type LiveQuestionRow = {
  id: string;
  askerIdentity: string;
  askerName: string;
  body: string;
  status: string;
  answer: string | null;
  upvotes: number;
  createdAt: Date;
  answeredAt: Date | null;
};

export async function askQuestion(
  liveSessionId: string,
  body: string,
  askerIdentity: string,
  askerName: string
): Promise<Result<LiveQuestionRow>> {
  await requirePermissionAction("live.view");

  try {
    const q = await prisma.liveQuestion.create({
      data: { liveSessionId, body, askerIdentity, askerName },
      select: {
        id: true,
        askerIdentity: true,
        askerName: true,
        body: true,
        status: true,
        answer: true,
        upvotes: true,
        createdAt: true,
        answeredAt: true,
      },
    });
    return { ok: true, data: q };
  } catch (e) {
    console.error("[LiveSession] ask question failed:", e);
    return { ok: false, error: "Failed to post question." };
  }
}

export async function upvoteQuestion(
  questionId: string,
  voterIdentity: string
): Promise<Result<void>> {
  await requirePermissionAction("live.view");

  try {
    await prisma.$transaction([
      prisma.liveQuestionUpvote.upsert({
        where: { questionId_voterIdentity: { questionId, voterIdentity } },
        create: { questionId, voterIdentity },
        update: {},
      }),
      prisma.liveQuestion.update({
        where: { id: questionId },
        data: { upvotes: { increment: 1 } },
      }),
    ]);
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] upvote question failed:", e);
    return { ok: false, error: "Failed to upvote." };
  }
}

export async function updateQuestionStatus(
  questionId: string,
  status: string,
  answer?: string
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    await prisma.liveQuestion.update({
      where: { id: questionId },
      data: {
        status: status as "OPEN" | "PINNED" | "ANSWERED" | "ARCHIVED",
        ...(answer !== undefined ? { answer } : {}),
        ...(status === "ANSWERED" ? { answeredAt: new Date() } : {}),
      },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[LiveSession] update question status failed:", e);
    return { ok: false, error: "Failed to update question." };
  }
}

export async function getSessionQuestions(
  liveSessionId: string
): Promise<Result<LiveQuestionRow[]>> {
  await requirePermissionAction("live.host");

  try {
    const rows = await prisma.liveQuestion.findMany({
      where: { liveSessionId },
      orderBy: [{ upvotes: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        askerIdentity: true,
        askerName: true,
        body: true,
        status: true,
        answer: true,
        upvotes: true,
        createdAt: true,
        answeredAt: true,
      },
    });
    return { ok: true, data: rows };
  } catch (e) {
    console.error("[LiveSession] get questions failed:", e);
    return { ok: false, error: "Failed to load questions." };
  }
}

// ── Phase 15: Session Analytics ───────────────────────────────────────────────

export type SessionAnalytics = {
  registered: number;
  joined: number;
  noShow: number;
  peakParticipants: number;
  avgDurationSeconds: number;
  attendancePct: number;
  sessionDurationSeconds: number | null;
  chatMessages: number;
  questionsAsked: number;
  pollsRun: number;
  pollResponses: number;
};

export async function getSessionAnalytics(
  liveSessionId: string
): Promise<Result<SessionAnalytics>> {
  await requirePermissionAction("live.host");

  try {
    const ls = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { courseSessionId: true, peakParticipants: true, startedAt: true, endedAt: true },
    });
    if (!ls) return { ok: false, error: "Live session not found." };

    const [registered, participants, chatMessages, questionsAsked, pollsRun, pollResponses] =
      await Promise.all([
        prisma.registration.count({
          where: {
            sessionId: ls.courseSessionId,
            status: { in: ["CONFIRMED", "ATTENDING", "COMPLETED", "PENDING"] },
          },
        }),
        prisma.liveSessionParticipant.findMany({
          where: { liveSessionId, role: "student" },
          select: { totalDurationSeconds: true },
        }),
        prisma.liveMessage.count({ where: { liveSessionId } }),
        prisma.liveQuestion.count({ where: { liveSessionId } }),
        prisma.livePoll.count({ where: { liveSessionId } }),
        prisma.livePollVote.count({ where: { poll: { liveSessionId } } }),
      ]);

    const joined = participants.length;
    const noShow = Math.max(0, registered - joined);
    const avgDurationSeconds =
      joined > 0
        ? Math.round(
            participants.reduce((sum, p) => sum + p.totalDurationSeconds, 0) / joined
          )
        : 0;
    const attendancePct = registered > 0 ? Math.round((joined / registered) * 100) : 0;
    const sessionDurationSeconds =
      ls.startedAt && ls.endedAt
        ? Math.round((ls.endedAt.getTime() - ls.startedAt.getTime()) / 1000)
        : null;

    return {
      ok: true,
      data: {
        registered,
        joined,
        noShow,
        peakParticipants: ls.peakParticipants,
        avgDurationSeconds,
        attendancePct,
        sessionDurationSeconds,
        chatMessages,
        questionsAsked,
        pollsRun,
        pollResponses,
      },
    };
  } catch (e) {
    console.error("[LiveSession] get analytics failed:", e);
    return { ok: false, error: "Failed to load session analytics." };
  }
}

export type CourseSessionsRollup = {
  totalSessions: number;
  sessionsWithLive: number;
  avgAttendancePct: number;
  avgNoShowPct: number;
  sessionsWithRecording: number;
};

export async function getCourseSessionsRollup(
  courseSlug: string
): Promise<Result<CourseSessionsRollup>> {
  await requirePermissionAction("live.host");

  try {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      select: { id: true },
    });
    if (!course) return { ok: false, error: "Course not found." };

    const sessions = await prisma.courseSession.findMany({
      where: { courseId: course.id },
      select: {
        id: true,
        // Take the most recent live session per course session for rollup metrics.
        liveSessions: {
          select: { id: true, recordingUrl: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const totalSessions = sessions.length;
    const sessionsWithLiveData = sessions.filter((s) => s.liveSessions.length > 0);
    const sessionsWithLive = sessionsWithLiveData.length;
    const sessionsWithRecording = sessionsWithLiveData.filter(
      (s) => s.liveSessions[0]?.recordingUrl
    ).length;

    if (sessionsWithLive === 0) {
      return {
        ok: true,
        data: { totalSessions, sessionsWithLive, avgAttendancePct: 0, avgNoShowPct: 0, sessionsWithRecording },
      };
    }

    const sessionIds = sessions.map((s) => s.id);
    const liveSessionIds = sessionsWithLiveData
      .map((s) => s.liveSessions[0]?.id)
      .filter((id): id is string => !!id);

    const [regCounts, joinedCounts] = await Promise.all([
      prisma.registration.groupBy({
        by: ["sessionId"],
        where: {
          sessionId: { in: sessionIds },
          status: { in: ["CONFIRMED", "ATTENDING", "COMPLETED", "PENDING"] },
        },
        _count: { id: true },
      }),
      prisma.liveSessionParticipant.groupBy({
        by: ["liveSessionId"],
        where: { liveSessionId: { in: liveSessionIds }, role: "student" },
        _count: { id: true },
      }),
    ]);

    const regMap = Object.fromEntries(regCounts.map((r) => [r.sessionId, r._count.id]));
    const joinedMap = Object.fromEntries(joinedCounts.map((j) => [j.liveSessionId, j._count.id]));

    let totalPct = 0;
    let counted = 0;
    for (const s of sessionsWithLiveData) {
      const lsId = s.liveSessions[0]?.id;
      if (!lsId) continue;
      const reg = regMap[s.id] ?? 0;
      if (reg > 0) {
        const joined = joinedMap[lsId] ?? 0;
        totalPct += (joined / reg) * 100;
        counted++;
      }
    }

    const avgAttendancePct = counted > 0 ? Math.round(totalPct / counted) : 0;

    return {
      ok: true,
      data: {
        totalSessions,
        sessionsWithLive,
        avgAttendancePct,
        avgNoShowPct: Math.max(0, 100 - avgAttendancePct),
        sessionsWithRecording,
      },
    };
  } catch (e) {
    console.error("[LiveSession] get course rollup failed:", e);
    return { ok: false, error: "Failed to load course analytics." };
  }
}

// ── Phase 17: Breakout Rooms ───────────────────────────────────────────────────

export type BreakoutRoomRow = {
  id: string;
  name: string;
  roomName: string;
  status: string;
  createdAt: Date;
  closedAt: Date | null;
  assignments: { identity: string; displayName: string }[];
};

function generateBreakoutRoomName(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return (
    "brk-" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

const BREAKOUT_SELECT = {
  id: true,
  name: true,
  roomName: true,
  status: true,
  createdAt: true,
  closedAt: true,
  assignments: { select: { identity: true, displayName: true } },
} as const;

export async function createBreakoutRooms(
  liveSessionId: string,
  count: number,
  names?: string[]
): Promise<Result<BreakoutRoomRow[]>> {
  await requirePermissionAction("live.host");

  const n = Math.min(Math.max(count, 2), 6);
  try {
    // Close any existing open rooms first.
    await prisma.breakoutRoom.updateMany({
      where: { liveSessionId, status: "OPEN" },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    const rooms = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        prisma.breakoutRoom.create({
          data: {
            liveSessionId,
            name: names?.[i] ?? `Group ${String.fromCharCode(65 + i)}`, // A, B, C…
            roomName: generateBreakoutRoomName(),
          },
          select: BREAKOUT_SELECT,
        })
      )
    );

    return { ok: true, data: rooms };
  } catch (e) {
    console.error("[Breakout] create rooms failed:", e);
    return { ok: false, error: "Failed to create breakout rooms." };
  }
}

export async function getBreakoutRooms(
  liveSessionId: string
): Promise<Result<BreakoutRoomRow[]>> {
  await requirePermissionAction("live.host");

  try {
    const rooms = await prisma.breakoutRoom.findMany({
      where: { liveSessionId, status: "OPEN" },
      orderBy: { createdAt: "asc" },
      select: BREAKOUT_SELECT,
    });
    return { ok: true, data: rooms };
  } catch (e) {
    console.error("[Breakout] get rooms failed:", e);
    return { ok: false, error: "Failed to load breakout rooms." };
  }
}

export async function saveBreakoutAssignments(
  assignments: { breakoutRoomId: string; identity: string; displayName: string }[]
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  if (assignments.length === 0) return { ok: true, data: undefined };

  try {
    await prisma.$transaction(
      assignments.map((a) =>
        prisma.breakoutAssignment.upsert({
          where: {
            breakoutRoomId_identity: {
              breakoutRoomId: a.breakoutRoomId,
              identity: a.identity,
            },
          },
          create: {
            breakoutRoomId: a.breakoutRoomId,
            identity: a.identity,
            displayName: a.displayName,
          },
          update: { displayName: a.displayName },
        })
      )
    );
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[Breakout] save assignments failed:", e);
    return { ok: false, error: "Failed to save assignments." };
  }
}

export async function getBreakoutToken(
  breakoutRoomId: string
): Promise<Result<{ token: string; url: string; roomName: string }>> {
  const auth = await requirePermissionAction("live.view");

  try {
    const room = await prisma.breakoutRoom.findUnique({
      where: { id: breakoutRoomId },
      select: { roomName: true, status: true },
    });
    if (!room) return { ok: false, error: "Breakout room not found." };
    if (room.status !== "OPEN") return { ok: false, error: "Breakout room is closed." };

    const url = getValidatedLivekitUrl();

    const canHost = hasPermission(auth.user.role, "live.host");
    const identity = canHost ? `host_${auth.user.id}` : `student_${auth.user.id}`;
    const name = auth.user.name ?? "Participant";
    const token = canHost
      ? await generateHostToken(identity, name, room.roomName)
      : await generateStudentToken(identity, name, room.roomName);

    return { ok: true, data: { token, url, roomName: room.roomName } };
  } catch (e) {
    console.error("[Breakout] get token failed:", e);
    return { ok: false, error: "Failed to generate breakout token." };
  }
}

export async function closeBreakoutRooms(
  liveSessionId: string
): Promise<Result<void>> {
  await requirePermissionAction("live.host");

  try {
    await prisma.breakoutRoom.updateMany({
      where: { liveSessionId, status: "OPEN" },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("[Breakout] close rooms failed:", e);
    return { ok: false, error: "Failed to close breakout rooms." };
  }
}
