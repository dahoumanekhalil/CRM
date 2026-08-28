"use client";

import * as React from "react";
import {
  CircleDot,
  Clock,
  Copy,
  Link2,
  Loader2,
  PenLine,
  Play,
  Radio,
  RotateCcw,
  Square,
  Video,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LiveRoom } from "./live-room";
import { WhiteboardPanel } from "./whiteboard-panel";
import { SessionSummaryDialog } from "./session-summary-dialog";
import type { ModerationActions } from "./moderator-panel";
import type {
  LiveSessionRow,
  SessionEndSummary,
} from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";
import type { TLEditorSnapshot } from "tldraw";

// Status badge colours matching the system's semantic palette.
const STATUS_CONFIG: Record<
  string,
  { label: string; dot?: string; badge: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    badge: "bg-muted text-muted-foreground",
  },
  WAITING: {
    label: "Waiting",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  LIVE: {
    label: "Live",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  ENDED: {
    label: "Ended",
    badge: "bg-muted text-muted-foreground",
  },
  RECORDING_PROCESSING: {
    label: "Processing",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-destructive/10 text-destructive",
  },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, badge: "bg-muted text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        cfg.badge
      )}
    >
      {cfg.dot && (
        <span
          className={cn("size-1.5 rounded-full animate-pulse", cfg.dot)}
        />
      )}
      {cfg.label}
    </span>
  );
}

// ── 22.1 — Countdown timer ────────────────────────────────────────────────────

function SessionCountdown({ scheduledAt }: { scheduledAt: Date }) {
  const [label, setLabel] = React.useState("");

  React.useEffect(() => {
    function tick() {
      const diff = scheduledAt.getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Starting soon");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setLabel(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  if (!label) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
      <Clock className="size-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">Starts in</span>
      <span className="font-mono font-semibold tabular-nums">{label}</span>
    </div>
  );
}

// ── Empty state: no live session yet ─────────────────────────────────────────

function NoLiveSession({
  onSetUp,
  onGoLiveNow,
  loading,
}: {
  onSetUp: () => void;
  onGoLiveNow: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/60 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Video className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No live session</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Set up a virtual classroom for this course session. Students can join
          with a secure invite link — no account required.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onGoLiveNow} disabled={loading} className="gap-2">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CircleDot className="size-4" />
          )}
          Go Live Now
        </Button>
        <Button variant="outline" onClick={onSetUp} disabled={loading} className="gap-2">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Radio className="size-4" />
          )}
          Set Up (get invite link first)
        </Button>
      </div>
    </div>
  );
}

// ── Active panel: session exists ──────────────────────────────────────────────

function LiveSessionCard({
  ls,
  courseSlug,
  courseSessionId,
  onGoLive,
  onEndSession,
  onCancel,
  loading,
  getRecordingUrlAction,
  onReRun,
  reRunLoading,
}: {
  ls: LiveSessionRow;
  courseSlug: string;
  courseSessionId: string;
  onGoLive: () => void;
  onEndSession: () => void;
  onCancel: () => void;
  loading: boolean;
  getRecordingUrlAction?: (liveSessionId: string) => Promise<{ ok: true; data: { url: string } } | { ok: false; error: string }>;
  whiteboardSnapshot?: TLEditorSnapshot | null;
  onReRun?: () => void;
  reRunLoading?: boolean;
}) {
  const [replayOpen, setReplayOpen] = React.useState(false);
  const [replayUrl, setReplayUrl] = React.useState<string | null>(null);
  const [replayLoading, setReplayLoading] = React.useState(false);
  const [wbOpen, setWbOpen] = React.useState(false);

  const isLive = ls.status === "LIVE" || ls.status === "WAITING";
  const isEnded = ls.status === "ENDED" || ls.status === "COMPLETED" || ls.status === "CANCELLED";

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${encodeURIComponent(ls.roomName)}`
      : `/join/${ls.roomName}`;

  function handleCopyInvite() {
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => toast.success("Guest link copied to clipboard"))
      .catch(() => toast.error("Could not copy — please copy the URL manually."));
  }

  async function handleWatchRecording() {
    if (!getRecordingUrlAction) return;
    setReplayLoading(true);
    const res = await getRecordingUrlAction(ls.id);
    setReplayLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setReplayUrl(res.data.url);
    setReplayOpen(true);
  }

  return (
    <>
    <Dialog open={replayOpen} onOpenChange={setReplayOpen}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
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

    {/* 10.3 — Read-only whiteboard replay dialog */}
    <Dialog open={wbOpen} onOpenChange={setWbOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden" style={{ height: "80vh" }}>
        <DialogHeader className="shrink-0 px-5 pt-5 pb-3">
          <DialogTitle className="text-sm font-semibold">Session Whiteboard</DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 min-h-0" style={{ height: "calc(80vh - 56px)" }}>
          {wbOpen && (
            <WhiteboardPanel
              initialSnapshot={ls.whiteboardSnapshot as unknown as TLEditorSnapshot | null}
              readOnly
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Classroom
          </h3>
          <StatusPill status={ls.status} />
        </div>
        <div className="flex items-center gap-2">
          {/* Copy invite */}
          {!isEnded && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyInvite}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link2 className="size-3.5" />
              <span className="hidden sm:inline">Guest link</span>
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {/* Stats row */}
        {(ls.startedAt || ls.endedAt || ls.totalJoins > 0) && (
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {ls.startedAt && (
              <span>
                Started{" "}
                <span className="font-medium text-foreground">
                  {isLive
                    ? formatDistanceToNow(ls.startedAt, { addSuffix: true })
                    : format(ls.startedAt, "d MMM yyyy, HH:mm")}
                </span>
              </span>
            )}
            {ls.endedAt && (
              <span>
                Ended{" "}
                <span className="font-medium text-foreground">
                  {format(ls.endedAt, "d MMM yyyy, HH:mm")}
                </span>
              </span>
            )}
            {ls.totalJoins > 0 && (
              <span>
                <span className="font-medium text-foreground">{ls.totalJoins}</span>{" "}
                participant{ls.totalJoins !== 1 ? "s" : ""} joined
              </span>
            )}
            {ls.peakParticipants > 0 && (
              <span>
                Peak{" "}
                <span className="font-medium text-foreground">
                  {ls.peakParticipants}
                </span>{" "}
                concurrent
              </span>
            )}
          </div>
        )}

        {/* No stats yet for scheduled */}
        {ls.status === "SCHEDULED" && !ls.startedAt && (
          <div className="mb-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Room is ready. Click{" "}
              <span className="font-medium text-foreground">Go Live</span> when
              you&apos;re ready to start the session. Share the Guest Link for observers to join without an account.
            </p>
            {ls.scheduledAt && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Scheduled for{" "}
                  <span className="font-medium text-foreground">
                    {format(ls.scheduledAt, "EEEE, d MMM yyyy 'at' HH:mm")}
                  </span>
                </span>
                {ls.scheduledAt.getTime() > Date.now() && (
                  <SessionCountdown scheduledAt={ls.scheduledAt} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!isEnded && (
          <div className="flex flex-wrap gap-2">
            {/* Go Live / Rejoin */}
            <Button
              onClick={onGoLive}
              disabled={loading}
              className="gap-2"
              variant={isLive ? "outline" : "default"}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CircleDot className={cn("size-4", isLive && "text-red-500")} />
              )}
              {isLive ? "Rejoin Room" : "Go Live"}
            </Button>

            {/* Copy invite */}
            <Button
              variant="outline"
              onClick={handleCopyInvite}
              className="gap-2"
            >
              <Copy className="size-4" />
              Guest Link
            </Button>

            {/* End session */}
            {isLive && (
              <Button
                variant="destructive"
                onClick={onEndSession}
                disabled={loading}
                className="ms-auto gap-2"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Square className="size-4 fill-current" />
                )}
                End Session
              </Button>
            )}

            {/* Cancel — only for SCHEDULED sessions, never for live */}
            {ls.status === "SCHEDULED" && (
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={loading}
                className="ms-auto gap-2 text-muted-foreground hover:text-destructive"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                Cancel Session
              </Button>
            )}
          </div>
        )}

        {isEnded && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-sm text-muted-foreground">
              This session has ended. View the attendance and activity tabs for
              a full summary.
            </p>
            {ls.recordingUrl && getRecordingUrlAction && (
              <Button
                variant="outline"
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
            {!!ls.whiteboardSnapshot && (
              <Button
                variant="outline"
                onClick={() => setWbOpen(true)}
                className="shrink-0 gap-2"
              >
                <PenLine className="size-4" />
                View Whiteboard
              </Button>
            )}
            {onReRun && (
              <Button
                variant="outline"
                onClick={onReRun}
                disabled={reRunLoading}
                className="shrink-0 gap-2"
              >
                {reRunLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                New Session
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
    </>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export function LiveSessionPanel({
  initialLiveSession,
  courseSessionId,
  courseSlug,
  createAction,
  goLiveAction,
  endAction,
  cancelAction,
  admitAction,
  rejectAction,
  moderationActions,
  startRecordingAction,
  stopRecordingAction,
  getRecordingUrlAction,
  sendMessageAction,
  getChatHistoryAction,
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
  reRunAction,
}: {
  initialLiveSession: LiveSessionRow | null;
  courseSessionId: string;
  courseSlug: string;
  createAction: (
    courseSessionId: string,
    courseSlug: string
  ) => Promise<
    | { ok: true; data: LiveSessionRow }
    | { ok: false; error: string }
  >;
  goLiveAction: (
    liveSessionId: string,
    courseSlug: string,
    courseSessionId: string
  ) => Promise<
    | { ok: true; data: { token: string; url: string; roomName: string } }
    | { ok: false; error: string }
  >;
  endAction: (
    liveSessionId: string,
    courseSlug: string,
    courseSessionId: string
  ) => Promise<{ ok: true; data: { status: "ENDED" | "RECORDING_PROCESSING"; summary: SessionEndSummary } } | { ok: false; error: string }>;
  cancelAction: (
    liveSessionId: string,
    courseSlug: string,
    courseSessionId: string
  ) => Promise<{ ok: true; data: void } | { ok: false; error: string }>;
  admitAction: (
    liveSessionId: string,
    participantIdentity: string
  ) => Promise<{ ok: true; data: void } | { ok: false; error: string }>;
  rejectAction: (
    liveSessionId: string,
    participantIdentity: string
  ) => Promise<{ ok: true; data: void } | { ok: false; error: string }>;
  moderationActions: ModerationActions;
  startRecordingAction: (
    liveSessionId: string
  ) => Promise<{ ok: true; data: { egressId: string } } | { ok: false; error: string }>;
  stopRecordingAction: (
    liveSessionId: string
  ) => Promise<{ ok: true; data: void } | { ok: false; error: string }>;
  getRecordingUrlAction?: (
    liveSessionId: string
  ) => Promise<{ ok: true; data: { url: string } } | { ok: false; error: string }>;
  sendMessageAction?: (liveSessionId: string, body: string) => Promise<{ ok: boolean; error?: string }>;
  getChatHistoryAction?: (liveSessionId: string, limit?: number) => Promise<{ ok: true; data: import("@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions").ChatMessage[] } | { ok: false; error: string }>;
  saveWhiteboardSnapshotAction?: (liveSessionId: string, snapshot: object) => Promise<{ ok: boolean; error?: string }>;
  createPollAction?: (liveSessionId: string, question: string, options: string[]) => Promise<{ ok: true; data: { id: string; question: string; options: string[] } } | { ok: false; error: string }>;
  submitVoteAction?: (pollId: string, voterIdentity: string, option: string) => Promise<{ ok: boolean; error?: string }>;
  closePollAction?: (pollId: string) => Promise<{ ok: boolean; error?: string }>;
  askQuestionAction?: (liveSessionId: string, body: string, askerIdentity: string, askerName: string) => Promise<{ ok: boolean; error?: string; data?: { id: string; askerIdentity: string; askerName: string; body: string; createdAt: Date } }>;
  upvoteQuestionAction?: (questionId: string, voterIdentity: string) => Promise<{ ok: boolean; error?: string }>;
  updateQuestionStatusAction?: (questionId: string, status: string, answer?: string) => Promise<{ ok: boolean; error?: string }>;
  createBreakoutRoomsAction?: (liveSessionId: string, count: number) => Promise<{ ok: boolean; data?: import("@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions").BreakoutRoomRow[]; error?: string }>;
  saveBreakoutAssignmentsAction?: (assignments: { breakoutRoomId: string; identity: string; displayName: string }[]) => Promise<{ ok: boolean; error?: string }>;
  closeBreakoutRoomsAction?: (liveSessionId: string) => Promise<{ ok: boolean; error?: string }>;
  getBreakoutTokenAction?: (breakoutRoomId: string) => Promise<{ ok: boolean; data?: { token: string; url: string; roomName: string }; error?: string }>;
  reRunAction?: (courseSessionId: string, courseSlug: string) => Promise<{ ok: true; data: LiveSessionRow } | { ok: false; error: string }>;
}) {
  const [ls, setLs] = React.useState<LiveSessionRow | null>(initialLiveSession);
  const [loading, setLoading] = React.useState(false);
  const [reRunLoading, setReRunLoading] = React.useState(false);
  const [roomSession, setRoomSession] = React.useState<{
    token: string;
    url: string;
    roomName: string;
  } | null>(null);
  const [endSummary, setEndSummary] = React.useState<{
    summary: SessionEndSummary;
    recordingProcessing: boolean;
  } | null>(null);

  async function handleSetUp() {
    setLoading(true);
    const res = await createAction(courseSessionId, courseSlug);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setLs(res.data);
  }

  async function handleGoLive() {
    if (!ls) return;
    setLoading(true);
    const res = await goLiveAction(ls.id, courseSlug, courseSessionId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setLs((prev) => prev && { ...prev, status: "LIVE" });
    setRoomSession(res.data);
  }

  async function handleEndSession() {
    if (!ls) return;
    setLoading(true);
    const res = await endAction(ls.id, courseSlug, courseSessionId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setLs((prev) => prev && { ...prev, status: res.data.status, endedAt: new Date() });
    setRoomSession(null);
    setEndSummary({ summary: res.data.summary, recordingProcessing: res.data.status === "RECORDING_PROCESSING" });
    toast.success(
      res.data.status === "RECORDING_PROCESSING"
        ? "Session ended — recording is being processed."
        : "Live session ended."
    );
  }

  // 22.3 — Atomically create the session and go live in one click.
  async function handleSetupAndGoLive() {
    setLoading(true);
    const createRes = await createAction(courseSessionId, courseSlug);
    if (!createRes.ok) {
      setLoading(false);
      toast.error(createRes.error);
      return;
    }
    const liveRes = await goLiveAction(createRes.data.id, courseSlug, courseSessionId);
    setLoading(false);
    if (!liveRes.ok) {
      setLs(createRes.data);
      toast.error(liveRes.error);
      return;
    }
    setLs((prev) => ({ ...(prev ?? createRes.data), status: "LIVE" }));
    setRoomSession(liveRes.data);
  }

  async function handleCancel() {
    if (!ls) return;
    setLoading(true);
    const res = await cancelAction(ls.id, courseSlug, courseSessionId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setLs((prev) => prev && { ...prev, status: "CANCELLED" });
    toast.success("Live session cancelled.");
  }

  async function handleReRun() {
    if (!reRunAction) return;
    setReRunLoading(true);
    const res = await reRunAction(courseSessionId, courseSlug);
    setReRunLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setLs(res.data);
    toast.success("New live session created.");
  }

  // Full-screen room view — takes over when in-room.
  if (roomSession) {
    return (
      <LiveRoom
        token={roomSession.token}
        url={roomSession.url}
        room={roomSession.roomName}
        onLeave={() => setRoomSession(null)}
        liveSessionId={ls?.id}
        isHost
        isLocked={ls?.locked ?? false}
        initialRecording={!!(ls?.egressId)}
        admitAction={admitAction}
        rejectAction={rejectAction}
        moderationActions={moderationActions}
        onLockedChange={(locked) => setLs((prev) => prev && { ...prev, locked })}
        startRecordingAction={startRecordingAction}
        stopRecordingAction={stopRecordingAction}
        sendMessageAction={sendMessageAction}
        getChatHistoryAction={getChatHistoryAction}
        initialWhiteboardSnapshot={ls?.whiteboardSnapshot as unknown as TLEditorSnapshot | null}
        saveWhiteboardSnapshotAction={saveWhiteboardSnapshotAction}
        createPollAction={createPollAction}
        submitVoteAction={submitVoteAction}
        closePollAction={closePollAction}
        askQuestionAction={askQuestionAction}
        upvoteQuestionAction={upvoteQuestionAction}
        updateQuestionStatusAction={updateQuestionStatusAction}
        createBreakoutRoomsAction={createBreakoutRoomsAction}
        saveBreakoutAssignmentsAction={saveBreakoutAssignmentsAction}
        closeBreakoutRoomsAction={closeBreakoutRoomsAction}
        getBreakoutTokenAction={getBreakoutTokenAction}
        onEndSession={handleEndSession}
      />
    );
  }

  if (!ls) {
    return (
      <NoLiveSession
        onSetUp={handleSetUp}
        onGoLiveNow={handleSetupAndGoLive}
        loading={loading}
      />
    );
  }

  return (
    <>
      {endSummary && (
        <SessionSummaryDialog
          open={!!endSummary}
          onClose={() => setEndSummary(null)}
          summary={endSummary.summary}
          recordingProcessing={endSummary.recordingProcessing}
          courseSlug={courseSlug}
          sessionId={courseSessionId}
        />
      )}
      <LiveSessionCard
        ls={ls}
        courseSlug={courseSlug}
        courseSessionId={courseSessionId}
        onGoLive={handleGoLive}
        onEndSession={handleEndSession}
        onCancel={handleCancel}
        loading={loading}
        getRecordingUrlAction={getRecordingUrlAction}
        whiteboardSnapshot={ls.whiteboardSnapshot as TLEditorSnapshot | null}
        onReRun={reRunAction ? handleReRun : undefined}
        reRunLoading={reRunLoading}
      />
    </>
  );
}
