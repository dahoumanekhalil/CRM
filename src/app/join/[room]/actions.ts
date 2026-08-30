"use server";

import { generateStudentToken, validateRoomName } from "@/lib/livekit/token";
import { getValidatedLivekitUrl } from "@/lib/livekit/config";
import { isBanned } from "@/lib/livekit/ephemeral-bans";
import { prisma } from "@/lib/prisma";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const GUEST_NAME_RE = /^[^\x00-\x1F]{1,40}$/;

export async function guestTokenAction(
  room: string,
  guestName: string
): Promise<Result<{ token: string; url: string }>> {
  const name = guestName.trim();

  if (!GUEST_NAME_RE.test(name)) {
    return {
      ok: false,
      error: "Name must be between 1 and 40 characters.",
    };
  }

  try {
    validateRoomName(room.trim());
  } catch {
    return {
      ok: false,
      error: "Invalid room name.",
    };
  }

  // 29.3 — If this is a LiveSession room, reject join when not LIVE or WAITING.
  try {
    const liveSession = await prisma.liveSession.findUnique({
      where: { roomName: room.trim() },
      select: { status: true },
    });
    if (liveSession) {
      const status = liveSession.status as string;
      if (status === "SCHEDULED") {
        return { ok: false, error: "The session hasn't started yet. Please wait for the trainer to open the classroom." };
      }
      if (status !== "LIVE" && status !== "WAITING") {
        return { ok: false, error: "This session has ended. The classroom is no longer available." };
      }
    }
  } catch {
    // DB unavailable — fall through and let the room join handle it.
  }

  try {
    const url = getValidatedLivekitUrl();
    const roomName = room.trim();
    // Use a short random suffix so two guests with the same name don't collide.
    const suffix = Math.random().toString(36).slice(2, 8);
    const identity = `student_${suffix}`;
    // Reject re-entry if this name (or a colliding identity, unlikely for
    // freshly generated suffixes) is on the room's ban list.
    if (isBanned(roomName, identity, name)) {
      return {
        ok: false,
        error: "You have been removed from this session by a moderator.",
      };
    }
    const token = await generateStudentToken(identity, name, roomName);
    return { ok: true, data: { token, url } };
  } catch (e) {
    console.error("[LiveKit] guest token generation failed:", e);
    return { ok: false, error: "Failed to generate meeting token. Please try again." };
  }
}

// ── Ephemeral Q&A (guest) ────────────────────────────────────────────────────
// Parallel to the admin-scoped versions in (app)/live-test/actions.ts. Guests
// have no session cookie, so these can't gate on auth — they only validate
// shape and rely on the LiveKit data channel to deliver state. Nothing is
// persisted. Real classrooms use the DB-backed actions.

const QA_MAX_BODY = 2000;

export async function askQuestionGuestAction(
  room: string,
  body: string,
  askerIdentity: string,
  askerName: string
): Promise<{
  ok: boolean;
  error?: string;
  data?: {
    id: string;
    askerIdentity: string;
    askerName: string;
    body: string;
    createdAt: Date;
  };
}> {
  try {
    validateRoomName(room);
  } catch {
    return { ok: false, error: "Invalid room." };
  }
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Question cannot be empty." };
  if (trimmed.length > QA_MAX_BODY) {
    return { ok: false, error: `Question is too long (max ${QA_MAX_BODY} characters).` };
  }
  if (!askerIdentity || !askerName) {
    return { ok: false, error: "Missing participant info." };
  }
  return {
    ok: true,
    data: {
      id: crypto.randomUUID(),
      askerIdentity,
      askerName,
      body: trimmed,
      createdAt: new Date(),
    },
  };
}

export async function upvoteQuestionGuestAction(
  questionId: string,
  voterIdentity: string
): Promise<{ ok: boolean; error?: string }> {
  if (!questionId || !voterIdentity) {
    return { ok: false, error: "Invalid vote." };
  }
  return { ok: true };
}

// Guests never invoke this in the UI (host controls are gated on isHost).
// Defense-in-depth: if it's ever called from a guest client, refuse. Signature
// mirrors updateQuestionStatus so it can be passed to QAPanel's typed prop.
export async function updateQuestionStatusGuestAction(
  _questionId: string,
  _status: string,
  _answer?: string
): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: "Only the trainer can moderate questions." };
}
