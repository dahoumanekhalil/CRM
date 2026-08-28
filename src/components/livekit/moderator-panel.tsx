"use client";

import * as React from "react";
import { useParticipants, useRoomContext } from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import {
  Check,
  Hand,
  Loader2,
  Lock,
  Mic,
  MicOff,
  Shield,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionResult = Promise<{ ok: boolean; error?: string }>;

export type ModerationActions = {
  muteTrack: (liveSessionId: string, identity: string, trackSid: string, muted: boolean) => ActionResult;
  kick: (liveSessionId: string, identity: string) => ActionResult;
  grantSpeaking: (liveSessionId: string, identity: string) => ActionResult;
  revokeSpeaking: (liveSessionId: string, identity: string) => ActionResult;
  muteAll: (liveSessionId: string) => ActionResult;
  toggleLock: (liveSessionId: string) => Promise<{ ok: boolean; error?: string; data?: { locked: boolean } }>;
};

// ── Moderator panel toggle button (used inside RoomHeader) ────────────────────

export function ModeratorToggle({
  open,
  count,
  onClick,
}: {
  open: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "relative h-7 gap-1 px-2 text-xs hover:bg-white/10",
        open ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
      )}
    >
      <Users className="size-3.5" />
      <span className="hidden sm:inline">Manage</span>
      {count > 0 && (
        <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
          {count}
        </span>
      )}
    </Button>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function ModeratorPanel({
  liveSessionId,
  isLocked,
  actions,
  onLockedChange,
}: {
  liveSessionId: string;
  isLocked: boolean;
  actions: ModerationActions;
  onLockedChange: (locked: boolean) => void;
}) {
  const participants = useParticipants();
  const room = useRoomContext();
  const [pending, setPending] = React.useState<Record<string, boolean>>({});
  const [muteAllPending, setMuteAllPending] = React.useState(false);
  const [lockPending, setLockPending] = React.useState(false);
  const [raisedHands, setRaisedHands] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    function handleData(payload: Uint8Array) {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as {
          type: string;
          identity?: string;
        };
        if (msg.type === "rh_raise" && msg.identity) {
          setRaisedHands((prev) => new Set([...prev, msg.identity!]));
        } else if (msg.type === "rh_lower" && msg.identity) {
          setRaisedHands((prev) => {
            const next = new Set(prev);
            next.delete(msg.identity!);
            return next;
          });
        }
      } catch {
        // not a raise-hand message
      }
    }
    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  const nonLocal = participants.filter((p) => !p.isLocal);

  function setItemPending(key: string, val: boolean) {
    setPending((s) => ({ ...s, [key]: val }));
  }

  async function handleMuteAudio(identity: string, trackSid: string, muted: boolean) {
    setItemPending(`audio-${identity}`, true);
    const res = await actions.muteTrack(liveSessionId, identity, trackSid, muted);
    setItemPending(`audio-${identity}`, false);
    if (!res.ok) toast.error(res.error ?? "Could not mute participant.");
  }

  async function handleMuteVideo(identity: string, trackSid: string, muted: boolean) {
    setItemPending(`video-${identity}`, true);
    const res = await actions.muteTrack(liveSessionId, identity, trackSid, muted);
    setItemPending(`video-${identity}`, false);
    if (!res.ok) toast.error(res.error ?? "Could not disable video.");
  }

  async function handleToggleSpeaking(identity: string, canPublish: boolean) {
    setItemPending(`speaking-${identity}`, true);
    const fn = canPublish ? actions.revokeSpeaking : actions.grantSpeaking;
    const res = await fn(liveSessionId, identity);
    setItemPending(`speaking-${identity}`, false);
    if (!res.ok) toast.error(res.error ?? "Could not update speaking permission.");
  }

  async function handleKick(identity: string) {
    setItemPending(`kick-${identity}`, true);
    const res = await actions.kick(liveSessionId, identity);
    setItemPending(`kick-${identity}`, false);
    if (!res.ok) toast.error(res.error ?? "Could not remove participant.");
  }

  async function handleMuteAll() {
    setMuteAllPending(true);
    const res = await actions.muteAll(liveSessionId);
    setMuteAllPending(false);
    if (res.ok) toast.success("All participants muted.");
    else toast.error(res.error ?? "Could not mute all.");
  }

  async function handleToggleLock() {
    setLockPending(true);
    const res = await actions.toggleLock(liveSessionId);
    setLockPending(false);
    if (res.ok && res.data) {
      onLockedChange(res.data.locked);
      toast.success(res.data.locked ? "Classroom locked." : "Classroom unlocked.");
    } else {
      toast.error(res.error ?? "Could not update lock.");
    }
  }

  return (
    <div className="absolute end-0 top-0 bottom-0 z-30 flex w-full sm:w-72 flex-col border-s border-white/10 bg-black/90 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-white/60" />
          <span className="text-sm font-semibold text-white">Participants</span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
            {nonLocal.length}
          </span>
        </div>
      </div>

      {/* Participant list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {nonLocal.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Users className="size-8 text-white/20" />
            <p className="text-xs text-white/40">No participants yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {nonLocal.map((p) => {
              const audioTrack = p.getTrackPublication(Track.Source.Microphone);
              const videoTrack = p.getTrackPublication(Track.Source.Camera);
              const audioSid = audioTrack?.trackSid;
              const videoSid = videoTrack?.trackSid;
              const audioMuted = audioTrack?.isMuted ?? true;
              const videoMuted = videoTrack?.isMuted ?? true;
              const canPublish = p.permissions?.canPublish ?? false;
              const isHost = p.identity.startsWith("host_");

              return (
                <li key={p.identity} className="px-4 py-3">
                  {/* Name row */}
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="truncate text-sm text-white/90">
                        {p.name || p.identity}
                      </span>
                      {isHost && (
                        <span className="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-400">
                          Host
                        </span>
                      )}
                      {raisedHands.has(p.identity) && (
                        <span title="Hand raised">
                          <Hand className="size-3.5 shrink-0 animate-bounce text-amber-400" />
                        </span>
                      )}
                    </div>
                    {/* Track status dots */}
                    <div className="flex shrink-0 items-center gap-1">
                      {audioMuted ? (
                        <MicOff className="size-3 text-red-400" />
                      ) : (
                        <Mic className="size-3 text-green-400" />
                      )}
                      {videoMuted ? (
                        <VideoOff className="size-3 text-red-400" />
                      ) : (
                        <Video className="size-3 text-green-400" />
                      )}
                    </div>
                  </div>

                  {/* Actions row — hide for other hosts */}
                  {!isHost && (
                    <div className="flex items-center gap-1">
                      {/* Mute / unmute audio */}
                      {audioSid && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!!pending[`audio-${p.identity}`]}
                          onClick={() => void handleMuteAudio(p.identity, audioSid, !audioMuted)}
                          className="h-6 gap-1 px-1.5 text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
                          title={audioMuted ? "Unmute mic" : "Mute mic"}
                        >
                          {pending[`audio-${p.identity}`] ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : audioMuted ? (
                            <Mic className="size-3" />
                          ) : (
                            <MicOff className="size-3" />
                          )}
                          <span>{audioMuted ? "Unmute" : "Mute"}</span>
                        </Button>
                      )}

                      {/* Disable / enable video */}
                      {videoSid && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!!pending[`video-${p.identity}`]}
                          onClick={() => void handleMuteVideo(p.identity, videoSid, !videoMuted)}
                          className="h-6 gap-1 px-1.5 text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
                          title={videoMuted ? "Enable camera" : "Disable camera"}
                          aria-label={videoMuted ? "Enable camera" : "Disable camera"}
                        >
                          {pending[`video-${p.identity}`] ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : videoMuted ? (
                            <Video className="size-3" />
                          ) : (
                            <VideoOff className="size-3" />
                          )}
                        </Button>
                      )}

                      {/* Grant / revoke speaking */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!!pending[`speaking-${p.identity}`]}
                        onClick={() => void handleToggleSpeaking(p.identity, canPublish)}
                        className={cn(
                          "h-6 gap-1 px-1.5 text-[10px] hover:bg-white/10",
                          canPublish
                            ? "text-green-400 hover:text-red-400"
                            : "text-white/60 hover:text-green-400"
                        )}
                        title={canPublish ? "Revoke speaking" : "Allow speaking"}
                      >
                        {pending[`speaking-${p.identity}`] ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : canPublish ? (
                          <X className="size-3" />
                        ) : (
                          <Check className="size-3" />
                        )}
                        <span>{canPublish ? "Revoke" : "Allow mic"}</span>
                      </Button>

                      {/* Kick */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!!pending[`kick-${p.identity}`]}
                        onClick={() => void handleKick(p.identity)}
                        className="ms-auto h-6 w-6 p-0 text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                        title="Remove from room"
                        aria-label="Remove from room"
                      >
                        {pending[`kick-${p.identity}`] ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <X className="size-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer — global actions */}
      <div className="space-y-2 border-t border-white/10 p-4">
        <Button
          size="sm"
          variant="ghost"
          disabled={muteAllPending}
          onClick={() => void handleMuteAll()}
          className="w-full justify-start gap-2 text-white/70 hover:bg-white/10 hover:text-white"
        >
          {muteAllPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <VolumeX className="size-4" />
          )}
          Mute All Participants
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={lockPending}
          onClick={() => void handleToggleLock()}
          className={cn(
            "w-full justify-start gap-2 hover:bg-white/10",
            isLocked
              ? "text-amber-400 hover:text-amber-300"
              : "text-white/70 hover:text-white"
          )}
        >
          {lockPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          {isLocked ? "Unlock Classroom" : "Lock Classroom"}
        </Button>
      </div>
    </div>
  );
}
