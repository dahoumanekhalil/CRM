"use server";

import { generateStudentToken, validateRoomName } from "@/lib/livekit/token";
import { getValidatedLivekitUrl } from "@/lib/livekit/config";
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
    // Use a short random suffix so two guests with the same name don't collide.
    const suffix = Math.random().toString(36).slice(2, 8);
    const identity = `student_${suffix}`;
    const token = await generateStudentToken(identity, name, room.trim());
    return { ok: true, data: { token, url } };
  } catch (e) {
    console.error("[LiveKit] guest token generation failed:", e);
    return { ok: false, error: "Failed to generate meeting token. Please try again." };
  }
}
