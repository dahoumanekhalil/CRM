"use client";

import * as React from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  Clock,
  ExternalLink,
  Play,
  Radio,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LiveRoom } from "@/components/livekit/live-room";
import type { LiveSessionListRow } from "./actions";

// 28.1-28.3 — Manager oversight: active + history, observer join.

const STATUS_CONFIG: Record<string, { label: string; dot?: string; badge: string }> = {
  LIVE:      { label: "Live",       dot: "bg-red-500", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  WAITING:   { label: "Waiting",    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ENDED:     { label: "Ended",      badge: "bg-muted text-muted-foreground" },
  RECORDING_PROCESSING: { label: "Processing", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  COMPLETED: { label: "Completed",  badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  CANCELLED: { label: "Cancelled",  badge: "bg-destructive/10 text-destructive" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, badge: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.badge)}>
      {cfg.dot && <span className={cn("size-1.5 rounded-full animate-pulse", cfg.dot)} />}
      {cfg.label}
    </span>
  );
}

function formatDuration(startedAt: Date | null, endedAt: Date | null): string {
  if (!startedAt || !endedAt) return "—";
  const min = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type ObserverSession = { token: string; url: string; roomName: string };

type Props = {
  active: LiveSessionListRow[];
  history: LiveSessionListRow[];
  joinAsObserverAction: (liveSessionId: string) => Promise<
    { ok: true; data: { token: string; url: string; roomName: string } } | { ok: false; error: string }
  >;
};

export function LiveSessionsClient({ active, history, joinAsObserverAction }: Props) {
  const [observerSession, setObserverSession] = React.useState<ObserverSession | null>(null);
  const [joiningId, setJoiningId] = React.useState<string | null>(null);

  async function handleJoinObserver(liveSessionId: string) {
    setJoiningId(liveSessionId);
    const res = await joinAsObserverAction(liveSessionId);
    setJoiningId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setObserverSession(res.data);
  }

  // Full-screen observer view when joined.
  if (observerSession) {
    return (
      <LiveRoom
        token={observerSession.token}
        url={observerSession.url}
        room={observerSession.roomName}
        onLeave={() => setObserverSession(null)}
        isHost={false}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* 28.1 — Active sessions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Active Now</h2>
          <span className="text-xs text-muted-foreground">
            {active.length} {active.length === 1 ? "session" : "sessions"} live
          </span>
        </div>

        {active.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 px-6 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <Radio className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No live sessions right now.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((row) => (
              <ActiveSessionCard
                key={row.id}
                row={row}
                joining={joiningId === row.id}
                onJoin={() => handleJoinObserver(row.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 28.2 — Session history */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Session History</h2>
          <span className="text-xs text-muted-foreground">Last {history.length} sessions</span>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 px-6 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <Video className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No past sessions yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">Session</th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground hidden sm:table-cell">Duration</th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground hidden lg:table-cell">Participants</th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {history.map((row) => (
                  <HistoryRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ActiveSessionCard({
  row,
  joining,
  onJoin,
}: {
  row: LiveSessionListRow;
  joining: boolean;
  onJoin: () => void;
}) {
  const sessionUrl = `/courses/${row.courseSlug}/sessions/${row.courseSessionId}?tab=live`;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{row.courseName}</p>
          <p className="text-xs text-muted-foreground truncate">{row.courseSessionTitle}</p>
        </div>
        <StatusPill status={row.status} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {row.startedAt && (
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatDistanceToNow(row.startedAt, { addSuffix: true })}
          </span>
        )}
        {row.totalJoins > 0 && (
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {row.totalJoins} joined
          </span>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 gap-1.5"
          onClick={onJoin}
          disabled={joining}
        >
          {joining ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Radio className="size-3.5" />
          )}
          Observe
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <Link href={sessionUrl}>
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function HistoryRow({ row }: { row: LiveSessionListRow }) {
  const sessionUrl = `/courses/${row.courseSlug}/sessions/${row.courseSessionId}?tab=live`;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          <p className="font-medium text-sm leading-tight">{row.courseName}</p>
          <p className="text-xs text-muted-foreground">{row.courseSessionTitle}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
        {row.endedAt ? format(row.endedAt, "d MMM yyyy") : "—"}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
        {formatDuration(row.startedAt, row.endedAt)}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
        <span className="flex items-center gap-1.5">
          <Users className="size-3" />
          {row.totalJoins}
          {row.peakParticipants > 0 && ` (peak ${row.peakParticipants})`}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusPill status={row.status} />
          {row.hasRecording && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Play className="size-2.5" />
              Rec
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-end">
        <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-xs" asChild>
          <Link href={sessionUrl}>
            <BookOpen className="size-3" />
            <span className="hidden sm:inline">View</span>
          </Link>
        </Button>
      </td>
    </tr>
  );
}
