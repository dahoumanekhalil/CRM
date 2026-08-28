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
  useChat,
  useLocalParticipant,
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
  BarChart2,
  CircleDot,
  CircleStop,
  HelpCircle,
  Link2,
  Loader2,
  LogOut,
  MessageSquare,
  PenLine,
  Users,
  Users2,
  Lock,
  LockOpen,
  Mic,
  MicOff,
  Square,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WhiteboardPanel } from "./whiteboard-panel";
import {
  StudentWaitingWrapper,
  WaitingParticipantsList,
} from "./waiting-room";
import {
  ModeratorPanel,
  ModeratorToggle,
  type ModerationActions,
} from "./moderator-panel";
import { ChatPanel } from "./chat-panel";
import { RaiseHandButton, RaisedHandsList } from "./raise-hand";
import {
  type ActivePoll,
  decodePollMsg,
  PollCreatorDialog,
  ActivePollResults,
  PollVoteOverlay,
} from "./poll-panel";
import { type QAQuestion, decodeQAMsg, QAPanel } from "./qa-panel";
import {
  type BrkMsg,
  encodeBrkMsg,
  decodeBrkMsg,
  BreakoutPanel,
} from "./breakout-panel";
import type {
  ChatMessage,
  BreakoutRoomRow,
} from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";
import type { TLEditorSnapshot } from "tldraw";

// ── Connection error classifier ───────────────────────────────────────────────

function classifyConnectionError(e: Error): string {
  if (process.env.NODE_ENV !== "production") {
    // Log full error in dev so we can see the exact reason code.
    console.error("[LiveKit] connection error", e);
  }
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
        // Includes LeaveRequest (server removed us) and other reasons.
        return "Disconnected from the room. Please rejoin.";
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

// ── Insecure-context banner (HTTPS required for camera/mic) ───────────────────
// navigator.mediaDevices is undefined on non-secure origins (http:// on LAN IPs).
// Without this warning, students see a raw JS TypeError when they try to unmute.

function hasMediaDevices(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function InsecureContextBanner() {
  const [dismissed, setDismissed] = React.useState(false);
  const [insecure, setInsecure] = React.useState(false);

  React.useEffect(() => {
    setInsecure(!hasMediaDevices());
  }, []);

  if (dismissed || !insecure) return null;
  return (
    <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 bg-amber-500/90 px-3 py-2 text-xs font-medium text-white sm:px-4">
      <div className="min-w-0">
        <p className="font-semibold">Camera and microphone are disabled on this page.</p>
        <p className="mt-0.5 opacity-90">
          Browsers only allow media access on HTTPS (or localhost). Open this page over
          HTTPS to use your mic and camera.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 rounded-md px-1.5 py-0.5 hover:bg-white/20"
      >
        ✕
      </button>
    </div>
  );
}

// ── Self-mute button (students with speaking permission) ──────────────────────

function SelfMuteButton() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const canPublish = localParticipant.permissions?.canPublish ?? false;

  async function handleToggle() {
    // Pre-flight: on http:// LAN pages, mediaDevices is undefined and calling
    // setMicrophoneEnabled throws a raw TypeError. Catch it with a friendly toast.
    if (!hasMediaDevices()) {
      toast.error(
        "Your browser can't access the microphone on this page. It must be served over HTTPS (or localhost).",
        { duration: 8000 }
      );
      return;
    }
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (e) {
      console.error("[LiveKit] setMicrophoneEnabled failed:", e);
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : "Could not toggle the microphone. Please check your device permissions."
      );
    }
  }

  if (!canPublish) return null;
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => void handleToggle()}
      className={cn(
        "h-7 gap-1 px-2 text-xs hover:bg-white/10",
        isMicrophoneEnabled
          ? "text-green-400 hover:text-red-400"
          : "text-white/70 hover:text-white"
      )}
    >
      {isMicrophoneEnabled ? (
        <Mic className="size-3.5" />
      ) : (
        <MicOff className="size-3.5" />
      )}
      <span className="hidden sm:inline">
        {isMicrophoneEnabled ? "Mute" : "Unmute"}
      </span>
    </Button>
  );
}

// ── Recording elapsed timer ───────────────────────────────────────────────────

function RecordingElapsed({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = React.useState("");

  React.useEffect(() => {
    function tick() {
      const ms = Date.now() - startedAt.getTime();
      const m = Math.floor(ms / 60_000);
      const s = Math.floor((ms % 60_000) / 1_000);
      setElapsed(
        `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!elapsed) return null;
  return (
    <span className="font-mono text-[10px] font-semibold tabular-nums text-red-400">
      {elapsed}
    </span>
  );
}

// ── Room header ───────────────────────────────────────────────────────────────

function RoomHeader({
  roomName,
  showWhiteboard,
  onToggleWhiteboard,
  recording,
  recordingPending,
  onToggleRecord,
  showModerator,
  onToggleModerator,
  showChat,
  onToggleChat,
  chatUnread,
  isHost,
  onOpenCreatePoll,
  hasActivePoll,
  showQA,
  onToggleQA,
  qaUnread,
  showBreakout,
  onToggleBreakout,
  onMuteAll,
  muteAllPending,
  isRoomLocked,
  onToggleLock,
  lockPending,
  onEndSession,
  endSessionPending,
  recordingStartedAt,
}: {
  roomName: string;
  showWhiteboard: boolean;
  onToggleWhiteboard: () => void;
  recording: boolean;
  recordingPending?: boolean;
  onToggleRecord: () => void;
  showModerator?: boolean;
  onToggleModerator?: () => void;
  showChat?: boolean;
  onToggleChat?: () => void;
  chatUnread?: number;
  isHost?: boolean;
  onOpenCreatePoll?: () => void;
  hasActivePoll?: boolean;
  showQA?: boolean;
  onToggleQA?: () => void;
  qaUnread?: number;
  showBreakout?: boolean;
  onToggleBreakout?: () => void;
  onMuteAll?: () => void;
  muteAllPending?: boolean;
  isRoomLocked?: boolean;
  onToggleLock?: () => void;
  lockPending?: boolean;
  onEndSession?: () => void;
  endSessionPending?: boolean;
  recordingStartedAt?: Date | null;
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

        {/* Record toggle + elapsed timer — host only */}
        {isHost && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleRecord}
              disabled={recordingPending}
              className={cn(
                "h-7 gap-1 px-2 text-xs hover:bg-white/10",
                recording
                  ? "text-red-400 hover:text-red-300"
                  : "text-white/70 hover:text-white"
              )}
            >
              {recordingPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : recording ? (
                <CircleStop className="size-3.5" />
              ) : (
                <CircleDot className="size-3.5" />
              )}
              <span className="hidden sm:inline">
                {recording ? "Stop" : "Record"}
              </span>
            </Button>
            {recording && recordingStartedAt && (
              <RecordingElapsed startedAt={recordingStartedAt} />
            )}
          </>
        )}

        {/* Poll — host only */}
        {isHost && onOpenCreatePoll && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenCreatePoll}
            className={cn(
              "relative h-7 gap-1 px-2 text-xs hover:bg-white/10",
              hasActivePoll
                ? "bg-violet-500/20 text-violet-400 hover:text-violet-300"
                : "text-white/70 hover:text-white"
            )}
          >
            <BarChart2 className="size-3.5" />
            <span className="hidden sm:inline">Poll</span>
            {hasActivePoll && (
              <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-violet-400" />
            )}
          </Button>
        )}

        {/* Mute All — host only quick action */}
        {isHost && onMuteAll && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onMuteAll}
            disabled={muteAllPending}
            title="Mute all participants"
            aria-label="Mute all participants"
            className="h-7 w-7 p-0 text-white/70 hover:bg-white/10 hover:text-white"
          >
            {muteAllPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <VolumeX className="size-3.5" />
            )}
          </Button>
        )}

        {/* Lock / Unlock — host only quick action */}
        {isHost && onToggleLock && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleLock}
            disabled={lockPending}
            title={isRoomLocked ? "Unlock classroom" : "Lock classroom"}
            className={cn(
              "h-7 w-7 p-0 hover:bg-white/10",
              isRoomLocked
                ? "text-amber-400 hover:text-amber-300"
                : "text-white/70 hover:text-white"
            )}
          >
            {lockPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isRoomLocked ? (
              <Lock className="size-3.5" />
            ) : (
              <LockOpen className="size-3.5" />
            )}
          </Button>
        )}

        {/* Raise hand — students only */}
        {!isHost && <RaiseHandButton />}

        {/* Self mute/unmute — students with speaking permission */}
        {!isHost && <SelfMuteButton />}

        {/* Chat toggle */}
        {onToggleChat && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleChat}
            className={cn(
              "relative h-7 gap-1 px-2 text-xs hover:bg-white/10",
              showChat ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
            )}
          >
            <MessageSquare className="size-3.5" />
            <span className="hidden sm:inline">Chat</span>
            {(chatUnread ?? 0) > 0 && !showChat && (
              <span className="absolute -top-0.5 -end-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {chatUnread! > 9 ? "9+" : chatUnread}
              </span>
            )}
          </Button>
        )}

        {/* Q&A toggle — all participants */}
        {onToggleQA && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleQA}
            className={cn(
              "relative h-7 gap-1 px-2 text-xs hover:bg-white/10",
              showQA
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white"
            )}
          >
            <HelpCircle className="size-3.5" />
            <span className="hidden sm:inline">Q&amp;A</span>
            {(qaUnread ?? 0) > 0 && !showQA && (
              <span className="absolute -top-0.5 -end-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {qaUnread! > 9 ? "9+" : qaUnread}
              </span>
            )}
          </Button>
        )}

        {/* Breakout rooms toggle — host only */}
        {isHost && onToggleBreakout && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleBreakout}
            className={cn(
              "h-7 gap-1 px-2 text-xs hover:bg-white/10",
              showBreakout
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white"
            )}
          >
            <Users2 className="size-3.5" />
            <span className="hidden sm:inline">Breakout</span>
          </Button>
        )}

        {/* Moderator panel toggle — host only */}
        {isHost && onToggleModerator && (
          <ModeratorToggle
            open={showModerator ?? false}
            count={participants.filter(
              (p) => !p.isLocal && p.identity.startsWith("student_")
            ).length}
            onClick={onToggleModerator}
          />
        )}

        {/* End Session — host only */}
        {isHost && onEndSession && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onEndSession}
            disabled={endSessionPending}
            className="h-7 gap-1 px-2 text-xs opacity-80 hover:opacity-100 sm:gap-1.5 sm:px-3"
          >
            {endSessionPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Square className="size-3.5 fill-current" />
            )}
            <span className="hidden sm:inline">End</span>
          </Button>
        )}

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
  liveSessionId,
  isHost,
  isLocked,
  initialRecording,
  admitAction,
  rejectAction,
  moderationActions,
  onLockedChange,
  startRecordingAction,
  stopRecordingAction,
  sendMessageAction,
  getChatHistoryAction,
  initialWhiteboardSnapshot,
  saveWhiteboardSnapshotAction,
  createPollAction,
  submitVoteAction,
  closePollAction,
  askQuestionAction,
  upvoteQuestionAction,
  updateQuestionStatusAction,
  createBreakoutRoomsAction,
  saveBreakoutAssignmentsAction,
  closeBreakoutRoomsAction,
  getBreakoutTokenAction,
  onBreakoutAssigned,
  onBreakoutEnded,
  onEndSession,
}: {
  roomName: string;
  onLeave: () => void;
  liveSessionId?: string;
  isHost?: boolean;
  isLocked?: boolean;
  initialRecording?: boolean;
  admitAction?: (liveSessionId: string, identity: string) => Promise<{ ok: boolean; error?: string }>;
  rejectAction?: (liveSessionId: string, identity: string) => Promise<{ ok: boolean; error?: string }>;
  moderationActions?: ModerationActions;
  onLockedChange?: (locked: boolean) => void;
  startRecordingAction?: (liveSessionId: string) => Promise<{ ok: boolean; error?: string }>;
  stopRecordingAction?: (liveSessionId: string) => Promise<{ ok: boolean; error?: string }>;
  sendMessageAction?: (liveSessionId: string, body: string) => Promise<{ ok: boolean; error?: string }>;
  getChatHistoryAction?: (liveSessionId: string, limit?: number) => Promise<{ ok: true; data: ChatMessage[] } | { ok: false; error: string }>;
  initialWhiteboardSnapshot?: TLEditorSnapshot | null;
  saveWhiteboardSnapshotAction?: (liveSessionId: string, snapshot: object) => Promise<{ ok: boolean; error?: string }>;
  createPollAction?: (liveSessionId: string, question: string, options: string[]) => Promise<{ ok: true; data: { id: string; question: string; options: string[] } } | { ok: false; error: string }>;
  submitVoteAction?: (pollId: string, voterIdentity: string, option: string) => Promise<{ ok: boolean; error?: string }>;
  closePollAction?: (pollId: string) => Promise<{ ok: boolean; error?: string }>;
  askQuestionAction?: (liveSessionId: string, body: string, askerIdentity: string, askerName: string) => Promise<{ ok: boolean; error?: string; data?: { id: string; askerIdentity: string; askerName: string; body: string; createdAt: Date } }>;
  upvoteQuestionAction?: (questionId: string, voterIdentity: string) => Promise<{ ok: boolean; error?: string }>;
  updateQuestionStatusAction?: (questionId: string, status: string, answer?: string) => Promise<{ ok: boolean; error?: string }>;
  // Breakout rooms
  createBreakoutRoomsAction?: (liveSessionId: string, count: number) => Promise<{ ok: boolean; data?: BreakoutRoomRow[]; error?: string }>;
  saveBreakoutAssignmentsAction?: (assignments: { breakoutRoomId: string; identity: string; displayName: string }[]) => Promise<{ ok: boolean; error?: string }>;
  closeBreakoutRoomsAction?: (liveSessionId: string) => Promise<{ ok: boolean; error?: string }>;
  getBreakoutTokenAction?: (breakoutRoomId: string) => Promise<{ ok: boolean; data?: { token: string; url: string; roomName: string }; error?: string }>;
  onBreakoutAssigned?: (params: { token: string; url: string; room: string }) => void;
  onBreakoutEnded?: () => void;
  onEndSession?: () => Promise<void>;
}) {
  const [showWhiteboard, setShowWhiteboard] = React.useState(false);
  // Keep whiteboard mounted once opened so tldraw state and sync are preserved.
  const [wbEverOpened, setWbEverOpened] = React.useState(false);

  const [showModerator, setShowModerator] = React.useState(false);
  const [showChat, setShowChat] = React.useState(false);
  const [chatUnread, setChatUnread] = React.useState(0);
  const [recording, setRecording] = React.useState(initialRecording ?? false);
  const [recordingPending, setRecordingPending] = React.useState(false);
  const [showBreakout, setShowBreakout] = React.useState(false);
  const [muteAllPending, setMuteAllPending] = React.useState(false);
  const [lockPending, setLockPending] = React.useState(false);
  const [endSessionPending, setEndSessionPending] = React.useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = React.useState<Date | null>(null);

  // Poll state
  const [activePoll, setActivePoll] = React.useState<ActivePoll | null>(null);
  const [showCreatePoll, setShowCreatePoll] = React.useState(false);

  // Q&A state
  const [questions, setQuestions] = React.useState<QAQuestion[]>([]);
  const [showQA, setShowQA] = React.useState(false);
  const [qaUnread, setQaUnread] = React.useState(0);

  // Data channel listener for poll messages.
  const pollRoom = useRoomContext();
  React.useEffect(() => {
    function handleData(payload: Uint8Array) {
      const msg = decodePollMsg(payload);
      if (!msg) return;
      if (msg.type === "poll_create") {
        setActivePoll({
          id: msg.poll.id,
          question: msg.poll.question,
          options: msg.poll.options,
          votes: Object.fromEntries(msg.poll.options.map((o) => [o, 0])),
          voters: [],
        });
      } else if (msg.type === "poll_vote") {
        setActivePoll((prev) => {
          if (!prev || prev.id !== msg.pollId) return prev;
          if (prev.voters.includes(msg.voterIdentity)) return prev;
          return {
            ...prev,
            votes: {
              ...prev.votes,
              [msg.option]: (prev.votes[msg.option] ?? 0) + 1,
            },
            voters: [...prev.voters, msg.voterIdentity],
          };
        });
      } else if (msg.type === "poll_close") {
        setActivePoll(null);
        setShowCreatePoll(false);
      }
    }
    pollRoom.on(RoomEvent.DataReceived, handleData);
    return () => {
      pollRoom.off(RoomEvent.DataReceived, handleData);
    };
  }, [pollRoom]);

  // Data channel listener for Q&A messages.
  React.useEffect(() => {
    function handleData(payload: Uint8Array) {
      const msg = decodeQAMsg(payload);
      if (!msg) return;
      if (msg.type === "qa_ask") {
        const q = msg.question;
        setQuestions((prev) => {
          if (prev.some((x) => x.id === q.id)) return prev; // dedup
          const newQ: QAQuestion = {
            id: q.id,
            askerIdentity: q.askerIdentity,
            askerName: q.askerName,
            body: q.body,
            status: "OPEN",
            answer: null,
            upvotes: 0,
            upvoters: [],
            createdAt: q.createdAt,
          };
          if (!showQA) setQaUnread((u) => u + 1);
          return [...prev, newQ];
        });
      } else if (msg.type === "qa_upvote") {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === msg.questionId && !q.upvoters.includes(msg.voterIdentity)
              ? { ...q, upvotes: q.upvotes + 1, upvoters: [...q.upvoters, msg.voterIdentity] }
              : q
          )
        );
      } else if (msg.type === "qa_update") {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === msg.questionId
              ? {
                  ...q,
                  status: msg.status as QAQuestion["status"],
                  answer: msg.answer !== undefined ? msg.answer : q.answer,
                }
              : q
          )
        );
      }
    }
    pollRoom.on(RoomEvent.DataReceived, handleData);
    return () => { pollRoom.off(RoomEvent.DataReceived, handleData); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollRoom, showQA]);

  // Data channel listener for breakout room messages (students only).
  React.useEffect(() => {
    if (isHost) return; // host never moves to a breakout room
    function handleData(payload: Uint8Array) {
      const msg = decodeBrkMsg(payload);
      if (!msg) return;
      if (msg.type === "brk_assign") {
        const myIdentity = pollRoom.localParticipant.identity;
        const assignment = msg.assignments[myIdentity];
        if (!assignment || !getBreakoutTokenAction) return;
        getBreakoutTokenAction(assignment.breakoutRoomId).then((res) => {
          if (res.ok && res.data) {
            onBreakoutAssigned?.({ token: res.data.token, url: res.data.url, room: res.data.roomName });
          } else {
            toast.error("Could not join breakout room.");
          }
        });
      } else if (msg.type === "brk_end") {
        onBreakoutEnded?.();
      }
    }
    pollRoom.on(RoomEvent.DataReceived, handleData);
    return () => { pollRoom.off(RoomEvent.DataReceived, handleData); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollRoom, isHost]);

  // Track unread chat messages when the panel is closed.
  const { chatMessages } = useChat();
  const prevChatLenRef = React.useRef(0);
  React.useEffect(() => {
    const newCount = chatMessages.length;
    if (!showChat && newCount > prevChatLenRef.current) {
      setChatUnread((u) => u + (newCount - prevChatLenRef.current));
    }
    prevChatLenRef.current = newCount;
  }, [chatMessages.length, showChat]);

  function handleToggleWhiteboard() {
    setShowWhiteboard((v) => {
      const next = !v;
      if (next && !wbEverOpened) setWbEverOpened(true);
      return next;
    });
  }

  function handleToggleChat() {
    setShowChat((v) => {
      if (!v) {
        setChatUnread(0);
        setShowModerator(false);
        setShowQA(false);
        setShowBreakout(false);
      }
      return !v;
    });
  }

  function handleToggleModerator() {
    setShowModerator((v) => {
      if (!v) {
        setShowChat(false);
        setShowQA(false);
        setShowBreakout(false);
      }
      return !v;
    });
  }

  function handleToggleBreakout() {
    setShowBreakout((v) => {
      if (!v) {
        setShowChat(false);
        setShowQA(false);
        setShowModerator(false);
      }
      return !v;
    });
  }

  function handleToggleQA() {
    setShowQA((v) => {
      if (!v) {
        setQaUnread(0);
        setShowChat(false);
        setShowModerator(false);
        setShowBreakout(false);
      }
      return !v;
    });
  }

  // Q&A state callbacks for QAPanel (optimistic updates)
  function handleQAAdd(q: QAQuestion) {
    setQuestions((prev) =>
      prev.some((x) => x.id === q.id) ? prev : [...prev, q]
    );
  }
  function handleQAUpvote(questionId: string, voterIdentity: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId && !q.upvoters.includes(voterIdentity)
          ? { ...q, upvotes: q.upvotes + 1, upvoters: [...q.upvoters, voterIdentity] }
          : q
      )
    );
  }
  function handleQAUpdate(questionId: string, status: string, answer?: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, status: status as QAQuestion["status"], answer: answer !== undefined ? answer : q.answer }
          : q
      )
    );
  }

  async function handleToggleRecord() {
    if (!liveSessionId || !startRecordingAction || !stopRecordingAction) return;
    setRecordingPending(true);
    if (recording) {
      const res = await stopRecordingAction(liveSessionId);
      if (res.ok) {
        setRecording(false);
        setRecordingStartedAt(null);
        toast.success("Recording stopped — processing in progress.");
      } else {
        toast.error(res.error ?? "Failed to stop recording.");
      }
    } else {
      const res = await startRecordingAction(liveSessionId);
      if (res.ok) {
        setRecording(true);
        setRecordingStartedAt(new Date());
        toast.success("Recording started.");
      } else {
        toast.error(res.error ?? "Failed to start recording.");
      }
    }
    setRecordingPending(false);
  }

  async function handleMuteAllQuick() {
    if (!liveSessionId || !moderationActions) return;
    setMuteAllPending(true);
    const res = await moderationActions.muteAll(liveSessionId);
    setMuteAllPending(false);
    if (res.ok) toast.success("All participants muted.");
    else toast.error(res.error ?? "Could not mute all.");
  }

  async function handleToggleLockQuick() {
    if (!liveSessionId || !moderationActions) return;
    setLockPending(true);
    const res = await moderationActions.toggleLock(liveSessionId);
    setLockPending(false);
    if (res.ok && res.data) {
      onLockedChange?.(res.data.locked);
      toast.success(res.data.locked ? "Classroom locked." : "Classroom unlocked.");
    } else {
      toast.error(res.error ?? "Could not update lock.");
    }
  }

  async function handleEndSessionQuick() {
    if (!onEndSession) return;
    setEndSessionPending(true);
    await onEndSession();
    setEndSessionPending(false);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ConnectionBanner onLeave={onLeave} />
      <InsecureContextBanner />
      <MediaDeviceErrorHandler />
      <RoomHeader
        roomName={roomName}
        showWhiteboard={showWhiteboard}
        onToggleWhiteboard={handleToggleWhiteboard}
        recording={recording}
        recordingPending={recordingPending}
        onToggleRecord={handleToggleRecord}
        isHost={isHost}
        showModerator={showModerator}
        onToggleModerator={isHost && liveSessionId && moderationActions ? handleToggleModerator : undefined}
        showChat={showChat}
        onToggleChat={liveSessionId && sendMessageAction && getChatHistoryAction ? handleToggleChat : undefined}
        chatUnread={chatUnread}
        onOpenCreatePoll={isHost && liveSessionId && createPollAction ? () => setShowCreatePoll((v) => !v) : undefined}
        hasActivePoll={!!activePoll}
        showQA={showQA}
        onToggleQA={liveSessionId && askQuestionAction ? handleToggleQA : undefined}
        qaUnread={qaUnread}
        showBreakout={showBreakout}
        onToggleBreakout={isHost && liveSessionId && createBreakoutRoomsAction ? handleToggleBreakout : undefined}
        onMuteAll={isHost && liveSessionId && moderationActions ? handleMuteAllQuick : undefined}
        muteAllPending={muteAllPending}
        isRoomLocked={isLocked}
        onToggleLock={isHost && liveSessionId && moderationActions ? handleToggleLockQuick : undefined}
        lockPending={lockPending}
        onEndSession={isHost && onEndSession ? handleEndSessionQuick : undefined}
        endSessionPending={endSessionPending}
        recordingStartedAt={recordingStartedAt}
      />

      {/* Main content area */}
      {isHost ? (
        <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Room content — shrinks when a side panel is open (desktop only; panels overlay on mobile) */}
          <div
            className={cn(
              "relative min-h-0 flex-1",
              showModerator && "md:me-72",
              (showChat || showQA || showBreakout) && "md:me-80"
            )}
          >
            <div
              className={cn(
                "h-full",
                showWhiteboard && "invisible pointer-events-none"
              )}
            >
              <VideoConference />
            </div>
            {wbEverOpened && (
              <div
                className={cn(
                  "absolute inset-0",
                  !showWhiteboard && "invisible pointer-events-none"
                )}
              >
                <WhiteboardPanel
                  liveSessionId={liveSessionId}
                  initialSnapshot={initialWhiteboardSnapshot}
                  saveSnapshotAction={saveWhiteboardSnapshotAction}
                />
              </div>
            )}
            {liveSessionId && admitAction && rejectAction && (
              <WaitingParticipantsList
                liveSessionId={liveSessionId}
                admitAction={admitAction}
                rejectAction={rejectAction}
              />
            )}
            {liveSessionId && moderationActions && (
              <RaisedHandsList
                liveSessionId={liveSessionId}
                grantSpeakingAction={moderationActions.grantSpeaking}
              />
            )}
            {/* Poll create dialog */}
            {showCreatePoll && liveSessionId && createPollAction && (
              <PollCreatorDialog
                liveSessionId={liveSessionId}
                createPollAction={createPollAction}
                onCreated={(poll) =>
                  setActivePoll({
                    id: poll.id,
                    question: poll.question,
                    options: poll.options,
                    votes: Object.fromEntries(poll.options.map((o) => [o, 0])),
                    voters: [],
                  })
                }
                onClose={() => setShowCreatePoll(false)}
              />
            )}
            {/* Active poll results for host */}
            {activePoll && closePollAction && (
              <ActivePollResults
                activePoll={activePoll}
                closePollAction={closePollAction}
                onClose={() => setActivePoll(null)}
              />
            )}
          </div>
          {/* Moderator panel (mutually exclusive with chat) */}
          {showModerator && !showChat && liveSessionId && moderationActions && (
            <ModeratorPanel
              liveSessionId={liveSessionId}
              isLocked={isLocked ?? false}
              actions={moderationActions}
              onLockedChange={onLockedChange ?? (() => {})}
            />
          )}
          {/* Chat panel */}
          {showChat && liveSessionId && sendMessageAction && getChatHistoryAction && (
            <ChatPanel
              liveSessionId={liveSessionId}
              sendMessageAction={sendMessageAction}
              getChatHistoryAction={getChatHistoryAction}
            />
          )}
          {/* Q&A panel (host) */}
          {showQA && !showChat && liveSessionId && askQuestionAction && upvoteQuestionAction && updateQuestionStatusAction && (
            <QAPanel
              questions={questions}
              isHost={true}
              liveSessionId={liveSessionId}
              askAction={askQuestionAction}
              upvoteAction={upvoteQuestionAction}
              updateStatusAction={updateQuestionStatusAction}
              onAdd={handleQAAdd}
              onUpvote={handleQAUpvote}
              onUpdate={handleQAUpdate}
            />
          )}
          {/* Breakout rooms panel (host) */}
          {showBreakout && liveSessionId && createBreakoutRoomsAction && saveBreakoutAssignmentsAction && closeBreakoutRoomsAction && (
            <BreakoutPanel
              liveSessionId={liveSessionId}
              createRoomsAction={createBreakoutRoomsAction}
              saveAssignmentsAction={saveBreakoutAssignmentsAction}
              closeRoomsAction={closeBreakoutRoomsAction}
              onBroadcastAssign={(msg) => {
                const data = encodeBrkMsg(msg);
                pollRoom.localParticipant.publishData(data, { reliable: true });
              }}
              onBroadcastEnd={() => {
                const data = encodeBrkMsg({ type: "brk_end" });
                pollRoom.localParticipant.publishData(data, { reliable: true });
              }}
            />
          )}
        </div>
      ) : (
        <StudentWaitingWrapper>
          <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
            <div
              className={cn(
                "relative min-h-0 flex-1",
                (showChat || showQA) && "md:me-80"
              )}
            >
              <div
                className={cn(
                  "h-full",
                  showWhiteboard && "invisible pointer-events-none"
                )}
              >
                <VideoConference />
              </div>
              {wbEverOpened && (
                <div
                  className={cn(
                    "absolute inset-0",
                    !showWhiteboard && "invisible pointer-events-none"
                  )}
                >
                  <WhiteboardPanel
                    liveSessionId={liveSessionId}
                    initialSnapshot={initialWhiteboardSnapshot}
                  />
                </div>
              )}
            </div>
            {/* Active poll vote overlay for students */}
            {activePoll && submitVoteAction && (
              <PollVoteOverlay
                activePoll={activePoll}
                submitVoteAction={submitVoteAction}
              />
            )}
            {/* Chat panel for students */}
            {showChat && liveSessionId && sendMessageAction && getChatHistoryAction && (
              <ChatPanel
                liveSessionId={liveSessionId}
                sendMessageAction={sendMessageAction}
                getChatHistoryAction={getChatHistoryAction}
              />
            )}
            {/* Q&A panel (student) */}
            {showQA && !showChat && liveSessionId && askQuestionAction && upvoteQuestionAction && updateQuestionStatusAction && (
              <QAPanel
                questions={questions}
                isHost={false}
                liveSessionId={liveSessionId}
                askAction={askQuestionAction}
                upvoteAction={upvoteQuestionAction}
                updateStatusAction={updateQuestionStatusAction}
                onAdd={handleQAAdd}
                onUpvote={handleQAUpvote}
                onUpdate={handleQAUpdate}
              />
            )}
          </div>
        </StudentWaitingWrapper>
      )}

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
  liveSessionId,
  isHost,
  isLocked,
  initialRecording,
  admitAction,
  rejectAction,
  moderationActions,
  onLockedChange,
  startRecordingAction,
  stopRecordingAction,
  sendMessageAction,
  getChatHistoryAction,
  initialWhiteboardSnapshot,
  saveWhiteboardSnapshotAction,
  createPollAction,
  submitVoteAction,
  closePollAction,
  askQuestionAction,
  upvoteQuestionAction,
  updateQuestionStatusAction,
  createBreakoutRoomsAction,
  saveBreakoutAssignmentsAction,
  closeBreakoutRoomsAction,
  getBreakoutTokenAction,
  onEndSession,
}: {
  token: string;
  url: string;
  room: string;
  onLeave: () => void;
  liveSessionId?: string;
  isHost?: boolean;
  isLocked?: boolean;
  initialRecording?: boolean;
  admitAction?: (liveSessionId: string, identity: string) => Promise<{ ok: boolean; error?: string }>;
  rejectAction?: (liveSessionId: string, identity: string) => Promise<{ ok: boolean; error?: string }>;
  moderationActions?: ModerationActions;
  onLockedChange?: (locked: boolean) => void;
  startRecordingAction?: (liveSessionId: string) => Promise<{ ok: boolean; error?: string }>;
  stopRecordingAction?: (liveSessionId: string) => Promise<{ ok: boolean; error?: string }>;
  sendMessageAction?: (liveSessionId: string, body: string) => Promise<{ ok: boolean; error?: string }>;
  getChatHistoryAction?: (liveSessionId: string, limit?: number) => Promise<{ ok: true; data: ChatMessage[] } | { ok: false; error: string }>;
  initialWhiteboardSnapshot?: TLEditorSnapshot | null;
  saveWhiteboardSnapshotAction?: (liveSessionId: string, snapshot: object) => Promise<{ ok: boolean; error?: string }>;
  createPollAction?: (liveSessionId: string, question: string, options: string[]) => Promise<{ ok: true; data: { id: string; question: string; options: string[] } } | { ok: false; error: string }>;
  submitVoteAction?: (pollId: string, voterIdentity: string, option: string) => Promise<{ ok: boolean; error?: string }>;
  closePollAction?: (pollId: string) => Promise<{ ok: boolean; error?: string }>;
  askQuestionAction?: (liveSessionId: string, body: string, askerIdentity: string, askerName: string) => Promise<{ ok: boolean; error?: string; data?: { id: string; askerIdentity: string; askerName: string; body: string; createdAt: Date } }>;
  upvoteQuestionAction?: (questionId: string, voterIdentity: string) => Promise<{ ok: boolean; error?: string }>;
  updateQuestionStatusAction?: (questionId: string, status: string, answer?: string) => Promise<{ ok: boolean; error?: string }>;
  createBreakoutRoomsAction?: (liveSessionId: string, count: number) => Promise<{ ok: boolean; data?: BreakoutRoomRow[]; error?: string }>;
  saveBreakoutAssignmentsAction?: (assignments: { breakoutRoomId: string; identity: string; displayName: string }[]) => Promise<{ ok: boolean; error?: string }>;
  closeBreakoutRoomsAction?: (liveSessionId: string) => Promise<{ ok: boolean; error?: string }>;
  getBreakoutTokenAction?: (breakoutRoomId: string) => Promise<{ ok: boolean; data?: { token: string; url: string; roomName: string }; error?: string }>;
  onEndSession?: () => Promise<void>;
}) {
  // Breakout room switching state.
  const [breakout, setBreakout] = React.useState<{ token: string; url: string; room: string } | null>(null);
  const isTransitioning = React.useRef(false);

  const activeToken = breakout?.token ?? token;
  const activeUrl = breakout?.url ?? url;
  const activeRoom = breakout?.room ?? room;

  function handleDisconnected() {
    if (isTransitioning.current) {
      isTransitioning.current = false;
      return;
    }
    onLeave();
  }

  function handleBreakoutAssigned(params: { token: string; url: string; room: string }) {
    isTransitioning.current = true;
    setBreakout(params);
    toast.info("Moving you to your breakout room…");
  }

  function handleBreakoutEnded() {
    if (!breakout) return;
    isTransitioning.current = true;
    setBreakout(null);
    toast.success("Breakout ended — returning to main room.");
  }

  const sharedProps = {
    onLeave,
    liveSessionId,
    isHost,
    isLocked,
    initialRecording,
    admitAction,
    rejectAction,
    moderationActions,
    onLockedChange,
    startRecordingAction,
    stopRecordingAction,
    sendMessageAction,
    getChatHistoryAction,
    initialWhiteboardSnapshot,
    saveWhiteboardSnapshotAction,
    createPollAction,
    submitVoteAction,
    closePollAction,
    askQuestionAction,
    upvoteQuestionAction,
    updateQuestionStatusAction,
    createBreakoutRoomsAction,
    saveBreakoutAssignmentsAction,
    closeBreakoutRoomsAction,
    getBreakoutTokenAction,
    onBreakoutAssigned: handleBreakoutAssigned,
    onBreakoutEnded: handleBreakoutEnded,
    onEndSession,
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <LiveKitRoom
        key={activeRoom}
        token={activeToken}
        serverUrl={activeUrl}
        connect
        audio={false}
        video={false}
        onConnected={() => {
          if (process.env.NODE_ENV !== "production") {
            console.log("[LiveKit] onConnected — room:", activeRoom, "url:", activeUrl);
          }
        }}
        onDisconnected={(reason) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[LiveKit] onDisconnected — reason:", reason);
          }
          handleDisconnected();
        }}
        onError={(e) => {
          // If the room fails to connect and we never reach onConnected, the UI
          // stays stuck on "connecting" because onDisconnected doesn't fire in
          // some error paths. Bail out to the lobby ourselves.
          toast.error(classifyConnectionError(e), { duration: 8000 });
          setTimeout(() => onLeave(), 500);
        }}
        data-lk-theme="default"
        style={
          {
            "--lk-accent-bg": "var(--primary)",
            "--lk-accent-fg": "var(--primary-foreground)",
          } as React.CSSProperties
        }
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <RoomContent
          roomName={activeRoom}
          {...sharedProps}
        />
      </LiveKitRoom>

      {/* Breakout room indicator for students */}
      {breakout && !isHost && (
        <div className="absolute bottom-4 start-4 z-50 flex items-center gap-2 rounded-full bg-violet-600/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
          Breakout room
        </div>
      )}
    </div>
  );
}
