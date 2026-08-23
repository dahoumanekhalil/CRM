import "server-only";
import { AccessToken } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error(
    "Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET environment variables."
  );
}

const ROOM_NAME_RE = /^[a-zA-Z0-9_-]{1,50}$/;

export function validateRoomName(room: string): void {
  if (!ROOM_NAME_RE.test(room)) {
    throw new Error(
      "Invalid room name. Use only letters, numbers, hyphens, and underscores (max 50 characters)."
    );
  }
}

export async function generateToken(
  identity: string,
  name: string,
  room: string
): Promise<string> {
  validateRoomName(room);

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl: "6h",
  });

  token.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return token.toJwt();
}
