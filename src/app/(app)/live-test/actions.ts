"use server";

import { auth } from "@/auth";
import { generateToken, validateRoomName } from "@/lib/livekit/token";

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

  const url = process.env.LIVEKIT_URL;
  if (!url) {
    return { ok: false, error: "Meeting server is not configured." };
  }

  try {
    const identity = session.user.id;
    const name = session.user.name ?? session.user.email ?? identity;
    const token = await generateToken(identity, name, room.trim());
    return { ok: true, data: { token, url } };
  } catch (e) {
    console.error("[LiveKit] token generation failed:", e);
    return { ok: false, error: "Failed to generate meeting token. Please try again." };
  }
}
