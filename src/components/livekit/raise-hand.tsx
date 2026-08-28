"use client";

import * as React from "react";
import {
  useRoomContext,
  useLocalParticipant,
} from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { Hand } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Wire protocol ─────────────────────────────────────────────────────────────

type RhRaise = {
  type: "rh_raise";
  identity: string;
  name: string;
  raisedAt: number;
};
type RhLower = { type: "rh_lower"; identity: string };
type RhMessage = RhRaise | RhLower;

function encode(msg: RhMessage): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify(msg)) as Uint8Array<ArrayBuffer>;
}

function decode(payload: Uint8Array): RhMessage | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(payload)) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "type" in parsed &&
      (parsed.type === "rh_raise" || parsed.type === "rh_lower")
    ) {
      return parsed as RhMessage;
    }
  } catch {}
  return null;
}

// ── RaiseHandButton (student) ─────────────────────────────────────────────────

export function RaiseHandButton() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const identity = localParticipant.identity;

  const [raised, setRaised] = React.useState(false);

  // Host can lower the hand (e.g. when granting speaking)
  React.useEffect(() => {
    function handleData(payload: Uint8Array) {
      const msg = decode(payload);
      if (msg?.type === "rh_lower" && msg.identity === identity) {
        setRaised(false);
      }
    }
    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, identity]);

  function toggle() {
    const next = !raised;
    setRaised(next);
    const msg: RhMessage = next
      ? {
          type: "rh_raise",
          identity,
          name: localParticipant.name ?? identity,
          raisedAt: Date.now(),
        }
      : { type: "rh_lower", identity };
    void room.localParticipant.publishData(encode(msg), { reliable: true });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={toggle}
      title={raised ? "Lower hand" : "Raise hand"}
      className={cn(
        "h-7 gap-1 px-2 text-xs hover:bg-white/10",
        raised
          ? "bg-amber-500/20 text-amber-400 hover:text-amber-300"
          : "text-white/70 hover:text-white"
      )}
    >
      <Hand className={cn("size-3.5", raised && "fill-amber-400")} />
      <span className="hidden sm:inline">{raised ? "Lower" : "Hand"}</span>
    </Button>
  );
}

// ── RaisedHandsList (host overlay) ───────────────────────────────────────────

type RaisedParticipant = { identity: string; name: string; raisedAt: number };

export function RaisedHandsList({
  liveSessionId,
  grantSpeakingAction,
}: {
  liveSessionId: string;
  grantSpeakingAction: (
    liveSessionId: string,
    identity: string
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const room = useRoomContext();
  const [hands, setHands] = React.useState<RaisedParticipant[]>([]);

  React.useEffect(() => {
    function handleData(payload: Uint8Array) {
      const msg = decode(payload);
      if (!msg) return;
      if (msg.type === "rh_raise") {
        setHands((prev) => {
          const rest = prev.filter((h) => h.identity !== msg.identity);
          return [...rest, { identity: msg.identity, name: msg.name, raisedAt: msg.raisedAt }].sort(
            (a, b) => a.raisedAt - b.raisedAt
          );
        });
      } else if (msg.type === "rh_lower") {
        setHands((prev) => prev.filter((h) => h.identity !== msg.identity));
      }
    }
    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  async function handleAllow(p: RaisedParticipant) {
    // Lower the hand on all participants via data channel
    void room.localParticipant.publishData(
      encode({ type: "rh_lower", identity: p.identity }),
      { reliable: true }
    );
    // Remove immediately from local list
    setHands((prev) => prev.filter((h) => h.identity !== p.identity));
    // Grant speaking permission via server action
    await grantSpeakingAction(liveSessionId, p.identity);
  }

  if (hands.length === 0) return null;

  return (
    <div className="absolute start-4 top-4 z-30 w-56 overflow-hidden rounded-xl border border-white/10 bg-black/80 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <Hand className="size-3.5 text-amber-400" />
        <span className="text-xs font-medium text-white">Raised Hands</span>
        <span className="ms-auto rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
          {hands.length}
        </span>
      </div>
      <ul className="max-h-60 overflow-y-auto py-1">
        {hands.map((p) => (
          <li key={p.identity} className="flex items-center gap-2 px-3 py-1.5">
            <Hand className="size-3 shrink-0 text-amber-400" />
            <span className="min-w-0 flex-1 truncate text-xs text-white/80">
              {p.name}
            </span>
            <button
              onClick={() => void handleAllow(p)}
              aria-label={`Allow ${p.name ?? p.identity} to speak`}
              className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
            >
              Allow
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
