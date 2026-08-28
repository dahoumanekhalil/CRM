import { format } from "date-fns";
import {
  CalendarDays,
  Clock,
  Play,
  Radio,
  Video,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStudentLiveSessions, type StudentLiveSessionRow } from "./live-sessions-actions";

// Status badge colours matching the live session palette.
const STATUS_CONFIG: Record<string, { label: string; dot?: string; badge: string }> = {
  SCHEDULED: { label: "Scheduled", badge: "bg-muted text-muted-foreground" },
  WAITING:   { label: "Waiting",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  LIVE:      { label: "Live",      dot: "bg-red-500", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ENDED:     { label: "Ended",     badge: "bg-muted text-muted-foreground" },
  RECORDING_PROCESSING: { label: "Processing", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  COMPLETED: { label: "Completed", badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  CANCELLED: { label: "Cancelled", badge: "bg-destructive/10 text-destructive" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, badge: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", cfg.badge)}>
      {cfg.dot && <span className={cn("size-1.5 rounded-full animate-pulse", cfg.dot)} />}
      {cfg.label}
    </span>
  );
}

function SessionRow({ row, past }: { row: StudentLiveSessionRow; past?: boolean }) {
  const sessionUrl = `/courses/${row.courseSlug}/sessions/${row.courseSessionId}?tab=live`;
  const isLive = row.liveStatus === "LIVE" || row.liveStatus === "WAITING";

  return (
    <div className="flex items-start gap-4 py-4 border-b border-border/60 last:border-0">
      <div className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg", isLive ? "bg-red-100 dark:bg-red-900/20" : "bg-muted")}>
        {isLive ? (
          <Radio className="size-4 text-red-600 dark:text-red-400" />
        ) : (
          <Video className="size-4 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium leading-tight">{row.courseName}</p>
          <StatusPill status={row.liveStatus} />
        </div>
        <p className="text-xs text-muted-foreground">{row.sessionTitle}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {!past && row.scheduledAt && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              {format(row.scheduledAt, "d MMM yyyy, HH:mm")}
            </span>
          )}
          {past && row.startedAt && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              {format(row.startedAt, "d MMM yyyy")}
            </span>
          )}
          {past && row.endedAt && row.startedAt && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {Math.round((row.endedAt.getTime() - row.startedAt.getTime()) / 60000)} min
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {past && row.hasRecording && (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2.5 text-xs" asChild>
            <Link href={sessionUrl}>
              <Play className="size-3" />
              Recording
            </Link>
          </Button>
        )}
        <Button size="sm" variant={isLive ? "default" : "ghost"} className="h-7 gap-1.5 px-2.5 text-xs" asChild>
          <Link href={sessionUrl}>
            <ExternalLink className="size-3" />
            {isLive ? "View Live" : "View"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

// 27.1–27.3 — Student portal: upcoming and past live sessions.
export async function LiveSessionsTab({ studentId }: { studentId: string }) {
  const { upcoming, past } = await getStudentLiveSessions(studentId);

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 px-6 py-12 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Video className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No live sessions</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            This student has no live sessions in their enrolled courses yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming
          </h3>
          <div className="rounded-xl border border-border/60 bg-card px-4 divide-y divide-border/60">
            {upcoming.map((row) => (
              <SessionRow key={row.liveSessionId} row={row} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Past Sessions
          </h3>
          <div className="rounded-xl border border-border/60 bg-card px-4 divide-y divide-border/60">
            {past.map((row) => (
              <SessionRow key={row.liveSessionId} row={row} past />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
