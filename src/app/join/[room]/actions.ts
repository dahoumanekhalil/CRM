"use server";

import { generateToken, validateRoomName } from "@/lib/livekit/token";

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

  const url = process.env.LIVEKIT_URL;
  if (!url) {
    return { ok: false, error: "Meeting server is not configured." };
  }

  try {
    // Use a short random suffix so two guests with the same name don't collide.
    const suffix = Math.random().toString(36).slice(2, 8);
    const identity = `guest_${suffix}`;
    const token = await generateToken(identity, name, room.trim());
    return { ok: true, data: { token, url } };
  } catch (e) {
    console.error("[LiveKit] guest token generation failed:", e);
    return { ok: false, error: "Failed to generate meeting token. Please try again." };
  }
}
