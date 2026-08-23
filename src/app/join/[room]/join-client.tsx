"use client";

import * as React from "react";
import { Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiveRoom } from "@/components/livekit/live-room";
import { guestTokenAction } from "./actions";

// ── Guest lobby ───────────────────────────────────────────────────────────────

function GuestLobby({
  roomName,
  onJoin,
}: {
  roomName: string;
  onJoin: (token: string, url: string) => void;
}) {
  const [guestName, setGuestName] = React.useState("");
  const [joining, setJoining] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) return;

    if (
      typeof window === "undefined" ||
      !("RTCPeerConnection" in window) ||
      !navigator.mediaDevices
    ) {
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

    onJoin(res.data.token, res.data.url);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
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
              autoFocus
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
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function JoinClient({ roomName }: { roomName: string }) {
  const [session, setSession] = React.useState<{
    token: string;
    url: string;
  } | null>(null);

  if (session) {
    return (
      <LiveRoom
        token={session.token}
        url={session.url}
        room={roomName}
        onLeave={() => setSession(null)}
      />
    );
  }

  return (
    <GuestLobby
      roomName={roomName}
      onJoin={(token, url) => setSession({ token, url })}
    />
  );
}
