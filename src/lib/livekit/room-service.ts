import "server-only";
import { RoomServiceClient } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const wsUrl = process.env.LIVEKIT_URL;

if (!apiKey || !apiSecret || !wsUrl) {
  throw new Error(
    "Missing LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL environment variables."
  );
}

if (process.env.NODE_ENV === "production" && wsUrl.startsWith("ws://")) {
  throw new Error("LIVEKIT_URL must use wss:// in production.");
}

// RoomServiceClient needs an HTTP(S) URL, not WebSocket.
const httpUrl = wsUrl.replace(/^wss?:\/\//, (match) =>
  match.startsWith("wss") ? "https://" : "http://"
);

export const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

/**
 * Grant a participant publish rights (trainer allows a student to speak).
 * Uses LiveKit's updateParticipant API — takes effect immediately in the live room.
 */
export async function grantSpeaking(
  roomName: string,
  identity: string
): Promise<void> {
  await roomService.updateParticipant(roomName, identity, undefined, {
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
}

/**
 * Revoke a participant's publish rights (mute or stop speaking).
 */
export async function revokeSpeaking(
  roomName: string,
  identity: string
): Promise<void> {
  await roomService.updateParticipant(roomName, identity, undefined, {
    canPublish: false,
    canSubscribe: true,
    canPublishData: true,
  });
}

/**
 * Mute a specific participant's audio track.
 */
export async function muteParticipantAudio(
  roomName: string,
  identity: string,
  trackSid: string,
  muted: boolean
): Promise<void> {
  await roomService.mutePublishedTrack(roomName, identity, trackSid, muted);
}

/**
 * Remove (kick) a participant from the room.
 */
export async function removeParticipant(
  roomName: string,
  identity: string
): Promise<void> {
  await roomService.removeParticipant(roomName, identity);
}

/**
 * Admit a waiting participant — only updates metadata to {"status":"admitted"}.
 * We deliberately do NOT set permissions here: the participant's token already
 * grants the correct permissions, and passing them again to updateParticipant
 * causes LiveKit to emit a LeaveRequest (permission-change renegotiation) which
 * disconnects the client before it can see the admission.
 */
export async function admitParticipant(
  roomName: string,
  identity: string
): Promise<void> {
  await roomService.updateParticipant(
    roomName,
    identity,
    JSON.stringify({ status: "admitted" })
  );
}

/**
 * Reject (remove) a waiting participant from the room.
 */
export async function rejectParticipant(
  roomName: string,
  identity: string
): Promise<void> {
  await roomService.removeParticipant(roomName, identity);
}

/**
 * Mute or unmute a specific published track for a participant.
 * trackSid is provided by the client from the LiveKit room context.
 */
export async function muteTrack(
  roomName: string,
  identity: string,
  trackSid: string,
  muted: boolean
): Promise<void> {
  await roomService.mutePublishedTrack(roomName, identity, trackSid, muted);
}

/**
 * Mute all audio tracks for every non-host participant in the room.
 * Lists participants server-side and mutes each audio track found.
 */
export async function muteAllStudents(roomName: string): Promise<void> {
  const participants = await roomService.listParticipants(roomName);
  await Promise.all(
    participants
      .filter((p) => !p.identity.startsWith("host_"))
      .flatMap((p) =>
        p.tracks
          .filter((t) => t.type === 0) // TrackType.AUDIO = 0
          .map((t) => roomService.mutePublishedTrack(roomName, p.identity, t.sid, true))
      )
  );
}
