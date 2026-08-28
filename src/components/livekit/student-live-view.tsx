"use client";

import * as React from "react";
import { format } from "date-fns";
import { Clock, Loader2, Play, Radio, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiveRoom } from "./live-room";
import type {
  LiveSessionRow,
  ChatMessage,
} from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";

// 22.2 — Students can join up to 15 minutes before the scheduled start.
const JOIN_WINDOW_MS = 15 * 60 * 1_000;

// ── Countdown hook ─────────────────────────────────────────────────────────────

function useCountdown(target: Date | null) {
  const calc = React.useCallback(() => {
    if (!target) return { label: "", withinWindow: true };
    const diff = target.getTime() - Date.now();
    const withinWindow = diff <= JOIN_WINDOW_MS;
    if (diff <= 0) return { label: "Starting soon", withinWindow: true };
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return {
      label: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      withinWindow,
    };
  }, [target]);

  const [state, setState] = React.useState(calc);

  React.useEffect(() => {
    if (!target) return;
    setState(calc());
    const id = setInterval(() => setState(calc()), 1_000);
    return () => clearInterval(id);
  }, [target, calc]);

  return state;
}

// ── Public component ───────────────────────────────────────────────────────────

export function StudentLiveView({
  liveSession,
  sessionStartDate,
  joinAction,
  getRecordingUrlAction,
  sendMessageAction,
  getChatHistoryAction,
  askQuestionAction,
  upvoteQuestionAction,
  submitVoteAction,
}: {
  liveSession: LiveSessionRow | null;
  sessionStartDate: Date;
  joinAction: (
    liveSessionId: string
  ) => Promise<
    | { ok: true; data: { token: string; url: string; roomName: string } }
    | { ok: false; error: string }
  >;
  getRecordingUrlAction?: (
    liveSessionId: string
  ) => Promise<{ ok: true; data: { url: string } } | { ok: false; error: string }>;
  sendMessageAction?: (
    liveSessionId: string,
    body: string
  ) => Promise<{ ok: boolean; error?: string }>;
  getChatHistoryAction?: (
    liveSessionId: string,
    limit?: number
  ) => Promise<{ ok: true; data: ChatMessage[] } | { ok: false; error: string }>;
  askQuestionAction?: (
    liveSessionId: string,
    body: string,
    askerIdentity: string,
    askerName: string
  ) => Promise<{
    ok: boolean;
    error?: string;
    data?: { id: string; askerIdentity: string; askerName: string; body: string; createdAt: Date };
  }>;
  upvoteQuestionAction?: (
    questionId: string,
    voterIdentity: string
  ) => Promise<{ ok: boolean; error?: string }>;
  submitVoteAction?: (
    pollId: string,
    voterIdentity: string,
    option: string
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [roomSession, setRoomSession] = React.useState<{
    token: string;
    url: string;
    roomName: string;
  } | null>(null);
  const [joining, setJoining] = React.useState(false);
  const [replayOpen, setReplayOpen] = React.useState(false);
  const [replayUrl, setReplayUrl] = React.useState<string | null>(null);
  const [replayLoading, setReplayLoading] = React.useState(false);

  const scheduleTarget = liveSession?.scheduledAt ?? sessionStartDate;
  const { label: countdown, withinWindow } = useCountdown(scheduleTarget);

  async function handleJoin() {
    if (!liveSession) return;
    setJoining(true);
    const res = await joinAction(liveSession.id);
    setJoining(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setRoomSession(res.data);
  }

  async function handleWatchRecording() {
    if (!liveSession || !getRecordingUrlAction) return;
    setReplayLoading(true);
    const res = await getRecordingUrlAction(liveSession.id);
    setReplayLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setReplayUrl(res.data.url);
    setReplayOpen(true);
  }

  // ── In-room view (subscribe-only — isHost is not set) ──────────────────────
  if (roomSession) {
    return (
      <LiveRoom
        token={roomSession.token}
        url={roomSession.url}
        room={roomSession.roomName}
        onLeave={() => setRoomSession(null)}
        liveSessionId={liveSession?.id}
        sendMessageAction={sendMessageAction}
        getChatHistoryAction={getChatHistoryAction}
        askQuestionAction={askQuestionAction}
        upvoteQuestionAction={upvoteQuestionAction}
        submitVoteAction={submitVoteAction}
      />
    );
  }

  // ── No live session created yet ─────────────────────────────────────────────
  if (!liveSession) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 px-6 py-10 text-center">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Video className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Live classroom not set up yet</p>
          <p className="text-xs text-muted-foreground">
            No virtual classroom has been configured for this session. Check back closer to the start date.
          </p>
        </div>
        {sessionStartDate && (
          <p className="text-xs text-muted-foreground">
            Scheduled:{" "}
            <span className="font-medium text-foreground">
              {format(sessionStartDate, "EEEE, d MMM yyyy 'at' HH:mm")}
            </span>
          </p>
        )}
      </div>
    );
  }

  const isLive = liveSession.status === "LIVE" || liveSession.status === "WAITING";
  const isEnded = ["ENDED", "COMPLETED", "RECORDING_PROCESSING", "CANCELLED"].includes(
    liveSession.status
  );

  // ── Session ended / recording available ────────────────────────────────────
  if (isEnded) {
    return (
      <>
        <Dialog open={replayOpen} onOpenChange={setReplayOpen}>
          <DialogContent className="max-w-3xl overflow-hidden p-0">
            <DialogHeader className="px-5 pb-3 pt-5">
              <DialogTitle className="text-sm font-semibold">Session Recording</DialogTitle>
            </DialogHeader>
            {replayUrl && (
              <video
                src={replayUrl}
                controls
                autoPlay
                className="w-full bg-black"
                style={{ maxHeight: "60vh" }}
              />
            )}
          </DialogContent>
        </Dialog>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="size-2 shrink-0 rounded-full bg-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {liveSession.status === "CANCELLED" ? "Session cancelled" : "Session has ended"}
              </p>
              {liveSession.endedAt && liveSession.status !== "CANCELLED" && (
                <p className="text-xs text-muted-foreground">
                  Ended {format(liveSession.endedAt, "d MMM yyyy, HH:mm")}
                </p>
              )}
              {liveSession.status === "RECORDING_PROCESSING" && (
                <p className="text-xs text-muted-foreground">Recording is being processed…</p>
              )}
            </div>
          </div>
          {liveSession.recordingUrl &&
            getRecordingUrlAction &&
            liveSession.status !== "CANCELLED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleWatchRecording}
                disabled={replayLoading}
                className="shrink-0 gap-2"
              >
                {replayLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                Watch Recording
              </Button>
            )}
        </div>
      </>
    );
  }

  // ── Pre-session / live state ────────────────────────────────────────────────
  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-5 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Live Classroom
        </h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isLive
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isLive && (
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
          )}
          {isLive ? "Live now" : "Scheduled"}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {/* Scheduled — show date + countdown */}
        {!isLive && (
          <div className="mb-5 space-y-2">
            <p className="text-sm text-muted-foreground">
              Scheduled for{" "}
              <span className="font-medium text-foreground">
                {format(scheduleTarget, "EEEE, d MMM yyyy 'at' HH:mm")}
              </span>
            </p>
            {countdown && !withinWindow && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Starts in</span>
                <span className="font-mono font-semibold tabular-nums">{countdown}</span>
              </div>
            )}
            {withinWindow && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Starting soon — join once the trainer opens the classroom.
              </p>
            )}
          </div>
        )}

        {isLive && (
          <p className="mb-4 text-sm text-muted-foreground">
            The session is live. Click below to enter the waiting room.
          </p>
        )}

        {/* Join button — only active when LIVE */}
        <Button onClick={handleJoin} disabled={!isLive || joining} className="gap-2">
          {joining ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Radio className="size-4" />
          )}
          {joining ? "Joining…" : "Join Classroom"}
        </Button>

        {!isLive && (
          <p className="mt-2 text-xs text-muted-foreground">
            The join button becomes active once the trainer starts the session.
          </p>
        )}
      </div>
    </section>
  );
}
