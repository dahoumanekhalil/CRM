"use client";

import * as React from "react";
import { Loader2, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiveRoom } from "@/components/livekit/live-room";
import {
  getTokenAction,
  admitGuestAction,
  rejectGuestAction,
  grantSpeakingAction,
  revokeSpeakingAction,
  muteTrackAction,
  kickAction,
  muteAllAction,
  toggleLockAction,
} from "./actions";

// ── Lobby ─────────────────────────────────────────────────────────────────────

function Lobby({
  onJoin,
}: {
  onJoin: (token: string, url: string, room: string) => void;
}) {
  const [roomName, setRoomName] = React.useState(() => {
    // Pre-fill from ?room= so invite links drop users straight into the right room.
    if (typeof window === "undefined") return "webscale-demo";
    return new URLSearchParams(window.location.search).get("room") ?? "webscale-demo";
  });
  const [joining, setJoining] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = roomName.trim();
    if (!name) return;

    // Pre-flight: WebRTC is required. Catch unsupported browsers before
    // making a server round-trip to generate a token.
    if (typeof window === "undefined" || !("RTCPeerConnection" in window)) {
      toast.error(
        "Your browser doesn't support video calls. Please use Chrome, Firefox, or Safari."
      );
      return;
    }

    setJoining(true);
    const res = await getTokenAction(name);
    setJoining(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    onJoin(res.data.token, res.data.url, name);
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Video className="size-7 text-primary" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Live Room Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter a room name to open an ad-hoc LiveKit room for testing.
          </p>
        </div>

        {/* Join form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="room-name"
              className="text-sm font-medium leading-none"
            >
              Room name
            </label>
            <Input
              id="room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="webscale-demo"
              autoComplete="off"
              autoFocus
              disabled={joining}
              maxLength={50}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={joining || !roomName.trim()}
          >
            {joining ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Video className="size-4" />
            )}
            {joining ? "Joining…" : "Join Room"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Admin only · Open another browser window to test multi-participant
        </p>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function LiveTestClient() {
  const [session, setSession] = React.useState<{
    token: string;
    url: string;
    room: string;
  } | null>(null);
  const [isLocked, setIsLocked] = React.useState(false);

  if (session) {
    return (
      <LiveRoom
        token={session.token}
        url={session.url}
        room={session.room}
        isHost
        onLeave={() => setSession(null)}
        liveSessionId={session.room}
        admitAction={admitGuestAction}
        rejectAction={rejectGuestAction}
        isLocked={isLocked}
        onLockedChange={setIsLocked}
        moderationActions={{
          muteTrack: muteTrackAction,
          kick: kickAction,
          grantSpeaking: grantSpeakingAction,
          revokeSpeaking: revokeSpeakingAction,
          muteAll: muteAllAction,
          toggleLock: toggleLockAction,
        }}
      />
    );
  }

  return (
    <Lobby
      onJoin={(token, url, room) => setSession({ token, url, room })}
    />
  );
}
