import "server-only";

/**
 * Returns the validated LIVEKIT_URL.
 * Throws at request-time if missing or if ws:// is used in production.
 * Call this instead of reading process.env.LIVEKIT_URL directly so the
 * wss:// check is enforced everywhere tokens are issued.
 */
export function getValidatedLivekitUrl(): string {
  const url = process.env.LIVEKIT_URL;
  if (!url) {
    throw new Error("LIVEKIT_URL environment variable is not set.");
  }
  if (process.env.NODE_ENV === "production" && url.startsWith("ws://")) {
    throw new Error(
      "LIVEKIT_URL must use wss:// in production. " +
        "Unencrypted ws:// exposes participant tokens in transit."
    );
  }
  return url;
}
