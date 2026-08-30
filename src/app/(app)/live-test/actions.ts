"use server";

import { auth } from "@/auth";
import { generateHostToken, validateRoomName } from "@/lib/livekit/token";
import { getValidatedLivekitUrl } from "@/lib/livekit/config";
import {
  admitParticipant,
  rejectParticipant,
  grantSpeaking,
  revokeSpeaking,
  muteTrack,
  muteAllStudents,
  removeParticipant,
} from "@/lib/livekit/room-service";
import {
  banFromRoom,
  unbanFromRoom,
  isBanned,
} from "@/lib/livekit/ephemeral-bans";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getTokenAction(
  room: string
): Promise<Result<{ token: string; url: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "You must be signed in to join a meeting." };
  }

  try {
    validateRoomName(room.trim());
  } catch {
    return {
      ok: false,
      error: "Invalid room name. Use only letters, numbers, hyphens, and underscores (max 50 characters).",
    };
  }

  try {
    const url = getValidatedLivekitUrl();
    const identity = session.user.id;
    const name = session.user.name ?? session.user.email ?? identity;
    const roomName = room.trim();
    if (isBanned(roomName, identity, name)) {
      return {
        ok: false,
        error: "You have been removed from this session by a moderator.",
      };
    }
    const token = await generateHostToken(identity, name, roomName);
    return { ok: true, data: { token, url } };
  } catch (e) {
    console.error("[LiveKit] token generation failed:", e);
    return { ok: false, error: "Failed to generate meeting token. Please try again." };
  }
}

// For the live-test diagnostic room, roomName is passed as the first arg
// (same signature as the session-based actions so LiveRoom can accept either).
export async function admitGuestAction(
  roomName: string,
  identity: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { ok: false, error: "Unauthorized." };
  try {
    await admitParticipant(roomName, identity);
    return { ok: true };
  } catch (e) {
    console.error("[LiveKit] admit failed:", e);
    return { ok: false, error: "Failed to admit participant." };
  }
}

export async function rejectGuestAction(
  roomName: string,
  identity: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { ok: false, error: "Unauthorized." };
  try {
    await rejectParticipant(roomName, identity);
    return { ok: true };
  } catch (e) {
    console.error("[LiveKit] reject failed:", e);
    return { ok: false, error: "Failed to remove participant." };
  }
}

// ── Moderator actions ────────────────────────────────────────────────────────
// All match the ModerationActions shape expected by <ModeratorPanel />.
// First arg is roomName (the live-test uses roomName as its "liveSessionId").

async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized.");
}

export async function grantSpeakingAction(
  roomName: string,
  identity: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertAdmin();
    await grantSpeaking(roomName, identity);
    return { ok: true };
  } catch (e) {
    console.error("[LiveKit] grantSpeaking failed:", e);
    return { ok: false, error: "Could not grant speaking permission." };
  }
}

export async function revokeSpeakingAction(
  roomName: string,
  identity: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertAdmin();
    await revokeSpeaking(roomName, identity);
    return { ok: true };
  } catch (e) {
    console.error("[LiveKit] revokeSpeaking failed:", e);
    return { ok: false, error: "Could not revoke speaking permission." };
  }
}

export async function muteTrackAction(
  roomName: string,
  identity: string,
  trackSid: string,
  muted: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertAdmin();
    await muteTrack(roomName, identity, trackSid, muted);
    return { ok: true };
  } catch (e) {
    console.error("[LiveKit] muteTrack failed:", e);
    return { ok: false, error: "Could not mute participant." };
  }
}

export async function kickAction(
  roomName: string,
  identity: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertAdmin();
    await removeParticipant(roomName, identity);
    return { ok: true };
  } catch (e) {
    console.error("[LiveKit] kick failed:", e);
    return { ok: false, error: "Could not remove participant." };
  }
}

export async function muteAllAction(
  roomName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertAdmin();
    await muteAllStudents(roomName);
    return { ok: true };
  } catch (e) {
    console.error("[LiveKit] muteAll failed:", e);
    return { ok: false, error: "Could not mute all participants." };
  }
}

// ── Block / unblock from live ────────────────────────────────────────────────
// "Block" = kick them out AND prevent them from rejoining. Contrast with
// kickAction above, which only removes them from the current session and lets
// them rejoin immediately.

export async function blockFromLiveAction(
  roomName: string,
  identity: string,
  displayName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, error: "Unauthorized." };
    }
    // Record the ban BEFORE kicking, so a race between the removal-triggered
    // reconnect and the ban write can't slip through.
    banFromRoom(roomName, identity, displayName, session.user.id);
    // Best-effort kick — if the user already left, this errors harmlessly.
    try {
      await removeParticipant(roomName, identity);
    } catch (e) {
      console.warn("[LiveKit] block: removeParticipant failed (already gone?)", e);
    }
    return { ok: true };
  } catch (e) {
    console.error("[LiveKit] blockFromLive failed:", e);
    return { ok: false, error: "Could not remove and block participant." };
  }
}

export async function unblockFromLiveAction(
  roomName: string,
  identity: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertAdmin();
    unbanFromRoom(roomName, identity);
    return { ok: true };
  } catch (e) {
    console.error("[LiveKit] unblockFromLive failed:", e);
    return { ok: false, error: "Could not unblock participant." };
  }
}

// ── Ephemeral Q&A stubs ──────────────────────────────────────────────────────
// The live-test diagnostic room has no LiveSession DB row, so the real
// askQuestion / upvoteQuestion / updateQuestionStatus actions can't be used.
// These return the shape QAPanel expects without persisting — the actual
// question state travels over the LiveKit data channel and lives in the
// clients' React state. Real classrooms use the DB-backed actions in
// courses/[slug]/sessions/[sessionId]/live-session-actions.ts.

const QA_MAX_BODY = 2000;
const QA_MAX_ANSWER = 4000;
const QA_ALLOWED_STATUSES = new Set(["OPEN", "PINNED", "ANSWERED", "ARCHIVED"]);

export async function askQuestionEphemeralAction(
  roomName: string,
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
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized." };
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Question cannot be empty." };
  if (trimmed.length > QA_MAX_BODY) {
    return { ok: false, error: `Question is too long (max ${QA_MAX_BODY} characters).` };
  }
  try {
    validateRoomName(roomName);
  } catch {
    return { ok: false, error: "Invalid room." };
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

export async function upvoteQuestionEphemeralAction(
  questionId: string,
  voterIdentity: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized." };
  if (!questionId || !voterIdentity) {
    return { ok: false, error: "Invalid vote." };
  }
  return { ok: true };
}

export async function updateQuestionStatusEphemeralAction(
  questionId: string,
  status: string,
  answer?: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized." };
  if (!questionId) return { ok: false, error: "Invalid question." };
  if (!QA_ALLOWED_STATUSES.has(status)) {
    return { ok: false, error: "Invalid status." };
  }
  if (answer !== undefined && answer.length > QA_MAX_ANSWER) {
    return { ok: false, error: `Answer is too long (max ${QA_MAX_ANSWER} characters).` };
  }
  return { ok: true };
}

// Lock state is in-memory only — live-test has no DB row to persist it to.
// Real classrooms persist this on the LiveSession record.
const _lockedRooms = new Set<string>();

export async function toggleLockAction(
  roomName: string
): Promise<{ ok: boolean; error?: string; data?: { locked: boolean } }> {
  try {
    await assertAdmin();
    const next = !_lockedRooms.has(roomName);
    if (next) _lockedRooms.add(roomName);
    else _lockedRooms.delete(roomName);
    return { ok: true, data: { locked: next } };
  } catch (e) {
    console.error("[LiveKit] toggleLock failed:", e);
    return { ok: false, error: "Could not update lock state." };
  }
}

