"use client";

import "@livekit/components-styles";

import * as React from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useConnectionState,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import {
  ConnectionState,
  ConnectionError,
  ConnectionErrorReason,
  DeviceUnsupportedError,
  RoomEvent,
  MediaDeviceFailure,
} from "livekit-client";
import {
  CircleDot,
  CircleStop,
  Link2,
  Loader2,
  LogOut,
  PenLine,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WhiteboardPanel } from "./whiteboard-panel";

// ── Connection error classifier ───────────────────────────────────────────────

function classifyConnectionError(e: Error): string {
  if (e instanceof DeviceUnsupportedError) {
    return "Your browser doesn't support video calls. Please use Chrome, Firefox, or Safari.";
  }
  if (e instanceof ConnectionError) {
    switch (e.reason) {
      case ConnectionErrorReason.NotAllowed:
        return "Session expired or access denied. Please rejoin.";
      case ConnectionErrorReason.ServerUnreachable:
      case ConnectionErrorReason.ServiceNotFound:
        return "Unable to reach the meeting server. Make sure it is running and try again.";
      case ConnectionErrorReason.Timeout:
        return "Connection timed out. Please check your network and try again.";
      case ConnectionErrorReason.WebSocket:
        return "Network connection lost. Please check your internet and try again.";
      default:
        return "Failed to connect to the room. Please try again.";
    }
  }
  return e.message || "An unexpected error occurred. Please try again.";
}

// ── Connection state banner ───────────────────────────────────────────────────

function ConnectionBanner({ onLeave }: { onLeave: () => void }) {
  const state = useConnectionState();
  if (state === ConnectionState.Connected) return null;

  const isReconnecting =
    state === ConnectionState.Reconnecting ||
    state === ConnectionState.SignalReconnecting;
  const isDisconnected = state === ConnectionState.Disconnected;

  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white",
        isDisconnected
          ? "bg-destructive/90"
          : isReconnecting
          ? "bg-amber-500/90"
          : "bg-yellow-500/90"
      )}
    >
      {!isDisconnected && <Loader2 className="size-4 animate-spin" />}
      {isDisconnected
        ? "Disconnected from room"
        : isReconnecting
        ? "Reconnecting…"
        : "Connecting…"}
      {isDisconnected && (
        <Button
          size="sm"
          variant="outline"
          className="ms-2 h-6 px-2 text-xs text-foreground"
          onClick={onLeave}
        >
          Back to lobby
        </Button>
      )}
    </div>
  );
}

// ── Media device error handler ────────────────────────────────────────────────

function MediaDeviceErrorHandler() {
  const room = useRoomContext();

  React.useEffect(() => {
    function handleMediaError(error: Error) {
      const failure = MediaDeviceFailure.getFailure(error);
      switch (failure) {
        case MediaDeviceFailure.PermissionDenied:
          toast.error(
            "Camera or microphone access was denied. Allow access in your browser settings and try again.",
            { duration: 6000 }
          );
          break;
        case MediaDeviceFailure.NotFound:
          toast.error(
            "No camera or microphone found. Please connect a device and try again."
          );
          break;
        case MediaDeviceFailure.DeviceInUse:
          toast.error(
            "Your camera or microphone is in use by another app. Close it and try again."
          );
          break;
        default:
          toast.error(
            error.message ||
              "A media device error occurred. Please check your devices and try again."
          );
      }
    }

    room.on(RoomEvent.MediaDevicesError, handleMediaError);
    return () => {
      room.off(RoomEvent.MediaDevicesError, handleMediaError);
    };
  }, [room]);

  return null;
}

// ── Room header ───────────────────────────────────────────────────────────────

function RoomHeader({
  roomName,
  showWhiteboard,
  onToggleWhiteboard,
  recording,
  onToggleRecord,
}: {
  roomName: string;
  showWhiteboard: boolean;
  onToggleWhiteboard: () => void;
  recording: boolean;
  onToggleRecord: () => void;
}) {
  const participants = useParticipants();
  const room = useRoomContext();

  function handleLeave() {
    void room.disconnect();
  }

  function handleInvite() {
    const url = `${window.location.origin}/join/${encodeURIComponent(roomName)}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Invite link copied to clipboard"))
      .catch(() =>
        toast.error("Could not copy link — please copy the URL manually.")
      );
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black/80 px-3 py-2 backdrop-blur-sm sm:gap-4 sm:px-4">
      {/* Brand + room name */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex shrink-0 items-center rounded-md bg-white px-1.5 py-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="Webscale" className="h-5 w-auto" />
        </div>
        <span className="truncate text-sm font-semibold text-white">
          {roomName}
        </span>
        <span className="hidden shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60 sm:inline-block">
          POC
        </span>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Participant count */}
        <div className="flex items-center gap-1 text-sm text-white/70">
          <Users className="size-4" />
          <span className="tabular-nums">{participants.length}</span>
        </div>

        {/* Invite */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleInvite}
          className="h-7 gap-1 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Link2 className="size-3.5" />
          <span className="hidden sm:inline">Invite</span>
        </Button>

        {/* Whiteboard toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleWhiteboard}
          className={cn(
            "h-7 gap-1 px-2 text-xs hover:bg-white/10",
            showWhiteboard
              ? "bg-white/20 text-white"
              : "text-white/70 hover:text-white"
          )}
        >
          <PenLine className="size-3.5" />
          <span className="hidden sm:inline">
            {showWhiteboard ? "Video" : "Board"}
          </span>
        </Button>

        {/* Record toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleRecord}
          className={cn(
            "h-7 gap-1 px-2 text-xs hover:bg-white/10",
            recording
              ? "text-red-400 hover:text-red-300"
              : "text-white/70 hover:text-white"
          )}
        >
          {recording ? (
            <CircleStop className="size-3.5" />
          ) : (
            <CircleDot className="size-3.5" />
          )}
          <span className="hidden sm:inline">
            {recording ? "Stop" : "Record"}
          </span>
        </Button>

        {/* Leave */}
        <Button
          size="sm"
          variant="destructive"
          className="h-7 gap-1 px-2 text-xs sm:gap-1.5 sm:px-3"
          onClick={handleLeave}
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </div>
    </div>
  );
}

// ── RoomContent ───────────────────────────────────────────────────────────────

function RoomContent({
  roomName,
  onLeave,
}: {
  roomName: string;
  onLeave: () => void;
}) {
  const [showWhiteboard, setShowWhiteboard] = React.useState(false);
  // Keep whiteboard mounted once opened so tldraw state and sync are preserved.
  const [wbEverOpened, setWbEverOpened] = React.useState(false);

  const [recording, setRecording] = React.useState(false);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  function handleToggleWhiteboard() {
    setShowWhiteboard((v) => {
      const next = !v;
      if (next && !wbEverOpened) setWbEverOpened(true);
      return next;
    });
  }

  async function handleToggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 } as MediaTrackConstraints,
        audio: true,
      });

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `webscale-${new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", "_")}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        toast.success("Recording saved.");
      };

      // Handle user clicking "Stop sharing" in the browser's native bar.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorder.state !== "inactive") recorder.stop();
      });

      recorder.start(1000); // collect in 1 s chunks
      recorderRef.current = recorder;
      setRecording(true);
      toast.success(
        "Recording started — pick this tab and check 'Share tab audio' for audio."
      );
    } catch (e) {
      // NotAllowedError = user cancelled the picker — no toast needed.
      if ((e as Error).name !== "NotAllowedError") {
        toast.error("Could not start recording. Please try again.");
      }
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ConnectionBanner onLeave={onLeave} />
      <MediaDeviceErrorHandler />
      <RoomHeader
        roomName={roomName}
        showWhiteboard={showWhiteboard}
        onToggleWhiteboard={handleToggleWhiteboard}
        recording={recording}
        onToggleRecord={handleToggleRecord}
      />

      {/* Main content area */}
      <div className="relative min-h-0 flex-1">
        {/* Video conference — always mounted; invisible when whiteboard is shown
            so LiveKit keeps tracks active and layout is preserved. */}
        <div
          className={cn(
            "h-full",
            showWhiteboard && "invisible pointer-events-none"
          )}
        >
          <VideoConference />
        </div>

        {/* Whiteboard — lazy-mounted on first open, then kept alive.
            Uses invisible (not hidden) so tldraw can measure canvas size. */}
        {wbEverOpened && (
          <div
            className={cn(
              "absolute inset-0",
              !showWhiteboard && "invisible pointer-events-none"
            )}
          >
            <WhiteboardPanel />
          </div>
        )}
      </div>

      <RoomAudioRenderer />
    </div>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export function LiveRoom({
  token,
  url,
  room,
  onLeave,
}: {
  token: string;
  url: string;
  room: string;
  onLeave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect
        audio={false}
        video={false}
        onDisconnected={onLeave}
        onError={(e) =>
          toast.error(classifyConnectionError(e), { duration: 8000 })
        }
        data-lk-theme="default"
        style={
          {
            "--lk-accent-bg": "var(--primary)",
            "--lk-accent-fg": "var(--primary-foreground)",
          } as React.CSSProperties
        }
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <RoomContent roomName={room} onLeave={onLeave} />
      </LiveKitRoom>
    </div>
  );
}
