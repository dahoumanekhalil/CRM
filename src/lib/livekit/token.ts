import "server-only";
import { AccessToken } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error(
    "Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET environment variables."
  );
}

// Warn in production if credentials look like LiveKit's well-known dev defaults.
if (process.env.NODE_ENV === "production") {
  if (apiKey === "devkey" || apiSecret === "secret") {
    throw new Error(
      "LIVEKIT_API_KEY / LIVEKIT_API_SECRET are set to LiveKit development defaults. " +
        "Generate real credentials before deploying to production."
    );
  }
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

export async function generateStudentToken(
  identity: string,
  name: string,
  room: string,
  ttl = "4h"
): Promise<string> {
  validateRoomName(room);

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl,
    metadata: JSON.stringify({ status: "waiting" }),
  });

  token.addGrant({
    roomJoin: true,
    room,
    canPublish: false,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  return token.toJwt();
}

export async function generateHostToken(
  identity: string,
  name: string,
  room: string,
  ttl = "4h"
): Promise<string> {
  validateRoomName(room);

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl,
  });

  token.addGrant({
    roomJoin: true,
    room,
    roomAdmin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  return token.toJwt();
}

// 28.3 — Observer token: hidden from participant count, subscribe-only.
// Managers/admins use this to silently monitor live sessions.
export async function generateObserverToken(
  identity: string,
  name: string,
  room: string,
  ttl = "4h"
): Promise<string> {
  validateRoomName(room);

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl,
  });

  token.addGrant({
    roomJoin: true,
    room,
    hidden: true,
    canPublish: false,
    canSubscribe: true,
    canPublishData: false,
    canUpdateOwnMetadata: false,
  });

  return token.toJwt();
}
