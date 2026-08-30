"use client";

import * as React from "react";
import { Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiveRoom } from "@/components/livekit/live-room";
import {
  guestTokenAction,
  askQuestionGuestAction,
  upvoteQuestionGuestAction,
  updateQuestionStatusGuestAction,
} from "./actions";

// sessionStorage key for the remembered guest name for a given room.
// Keyed per room so joining a different session prompts for name again.
// sessionStorage (not localStorage) so the name naturally clears when the
// tab closes — matches the "until session ends" expectation.
const nameStorageKey = (roomName: string) => `webscale-guest-name:${roomName}`;

// ── Guest lobby ───────────────────────────────────────────────────────────────

function GuestLobby({
  roomName,
  onJoin,
}: {
  roomName: string;
  onJoin: (token: string, url: string, name: string) => void;
}) {
  // Pre-fill from sessionStorage so a returning guest doesn't retype their name.
  const [guestName, setGuestName] = React.useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(nameStorageKey(roomName)) ?? "";
  });
  const [joining, setJoining] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) return;

    if (typeof window === "undefined" || !("RTCPeerConnection" in window)) {
      toast.error(
        "Your browser doesn't support video calls. Please use Chrome, Firefox, or Safari."
      );
      return;
    }

    setJoining(true);
    const res = await guestTokenAction(roomName, name);
    setJoining(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    onJoin(res.data.token, res.data.url, name);
  }

  return (
    <div className="min-h-dvh bg-background overflow-y-auto">
      <div className="flex min-h-dvh flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8 py-8">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/logo.webp"
              alt="Webscale"
              width={1536}
              height={1024}
              className="h-14 w-auto"
              priority
            />
          </div>

          {/* Heading */}
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Join Live Session
            </h1>
            <p className="text-sm text-muted-foreground">
              You&apos;re joining{" "}
              <span className="font-medium text-foreground">{roomName}</span>
            </p>
          </div>

          {/* Name form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="guest-name"
                className="text-sm font-medium leading-none"
              >
                Your name
              </label>
              <Input
                id="guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name"
                autoComplete="name"
                disabled={joining}
                maxLength={40}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={joining || !guestName.trim()}
            >
              {joining ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Video className="size-4" />
              )}
              {joining ? "Joining…" : "Join as Guest"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            No account needed — you&apos;ll join as a guest.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function JoinClient({ roomName }: { roomName: string }) {
  const [session, setSession] = React.useState<{
    token: string;
    url: string;
  } | null>(null);
  const [autoJoining, setAutoJoining] = React.useState(false);
  const [showLobby, setShowLobby] = React.useState(false);

  // On mount, try to auto-join with a saved name. Falls back to lobby on failure.
  React.useEffect(() => {
    const saved = sessionStorage.getItem(nameStorageKey(roomName));
    if (!saved) {
      setShowLobby(true);
      return;
    }
    setAutoJoining(true);
    guestTokenAction(roomName, saved).then((res) => {
      if (res.ok) {
        setSession({ token: res.data.token, url: res.data.url });
      } else {
        // Saved name is stale or the session is closed — forget it and prompt.
        sessionStorage.removeItem(nameStorageKey(roomName));
        toast.error(res.error);
        setShowLobby(true);
      }
      setAutoJoining(false);
    });
  }, [roomName]);

  if (session) {
    return (
      <LiveRoom
        token={session.token}
        url={session.url}
        room={roomName}
        onLeave={() => setSession(null)}
        // Enable ephemeral chat + moderation + Q&A for guests. Room name
        // doubles as session id — all state travels over the LiveKit data
        // channel only (no server-side persistence for anonymous guests).
        liveSessionId={roomName}
        askQuestionAction={askQuestionGuestAction}
        upvoteQuestionAction={upvoteQuestionGuestAction}
        updateQuestionStatusAction={updateQuestionStatusGuestAction}
      />
    );
  }

  if (autoJoining || !showLobby) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <GuestLobby
      roomName={roomName}
      onJoin={(token, url, name) => {
        sessionStorage.setItem(nameStorageKey(roomName), name);
        setSession({ token, url });
      }}
    />
  );
}
