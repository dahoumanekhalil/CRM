import {
  BarChart2,
  MessageSquare,
  HelpCircle,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  SessionAnalytics,
  CourseSessionsRollup,
} from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: "green" | "amber" | "red" | "blue" | "violet";
}) {
  const iconColors: Record<string, string> = {
    green: "text-emerald-500",
    amber: "text-amber-500",
    red: "text-red-500",
    blue: "text-blue-500",
    violet: "text-violet-500",
  };
  const bgColors: Record<string, string> = {
    green: "bg-emerald-500/8",
    amber: "bg-amber-500/8",
    red: "bg-red-500/8",
    blue: "bg-blue-500/8",
    violet: "bg-violet-500/8",
  };
  const iconColor = accent ? iconColors[accent] : "text-muted-foreground";
  const bgColor = accent ? bgColors[accent] : "bg-muted/40";

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
        <span className={cn("rounded-lg p-1.5 shrink-0", bgColor)}>
          <Icon className={cn("size-4", iconColor)} />
        </span>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
      {children}
    </p>
  );
}

// ── SessionAnalyticsOverview ──────────────────────────────────────────────────

export function SessionAnalyticsOverview({
  analytics,
}: {
  analytics: SessionAnalytics;
}) {
  const {
    registered,
    joined,
    noShow,
    peakParticipants,
    avgDurationSeconds,
    attendancePct,
    sessionDurationSeconds,
    chatMessages,
    questionsAsked,
    pollsRun,
    pollResponses,
  } = analytics;

  const attendanceAccent =
    attendancePct >= 75 ? "green" : attendancePct >= 50 ? "amber" : "red";

  return (
    <div className="space-y-4">
      {/* Attendance overview */}
      <div>
        <SectionLabel>Attendance</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            label="Registered"
            value={registered}
            icon={Users}
            accent="blue"
          />
          <StatCard
            label="Joined"
            value={joined}
            icon={Users}
            accent="green"
          />
          <StatCard
            label="No-show"
            value={noShow}
            icon={noShow > 0 ? TrendingDown : Users}
            accent={noShow > 0 ? "red" : undefined}
          />
          <StatCard
            label="Attendance"
            value={`${attendancePct}%`}
            icon={TrendingUp}
            accent={attendanceAccent}
          />
        </div>
      </div>

      {/* Timing */}
      <div>
        <SectionLabel>Timing</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatCard
            label="Session Duration"
            value={
              sessionDurationSeconds !== null
                ? formatDuration(sessionDurationSeconds)
                : "—"
            }
            sub={sessionDurationSeconds === null ? "Session still running" : undefined}
            icon={Clock}
            accent="blue"
          />
          <StatCard
            label="Avg Participant Duration"
            value={avgDurationSeconds > 0 ? formatDuration(avgDurationSeconds) : "—"}
            icon={Clock}
          />
          <StatCard
            label="Peak Participants"
            value={peakParticipants}
            icon={Users}
            accent="violet"
          />
        </div>
      </div>

      {/* Engagement */}
      <div>
        <SectionLabel>Engagement</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            label="Chat Messages"
            value={chatMessages}
            icon={MessageSquare}
            accent={chatMessages > 0 ? "blue" : undefined}
          />
          <StatCard
            label="Questions Asked"
            value={questionsAsked}
            icon={HelpCircle}
            accent={questionsAsked > 0 ? "violet" : undefined}
          />
          <StatCard
            label="Polls Run"
            value={pollsRun}
            icon={BarChart2}
            accent={pollsRun > 0 ? "amber" : undefined}
          />
          <StatCard
            label="Poll Responses"
            value={pollResponses}
            icon={BarChart2}
            accent={pollResponses > 0 ? "amber" : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ── CourseRollupCard ──────────────────────────────────────────────────────────

export function CourseRollupCard({
  rollup,
}: {
  rollup: CourseSessionsRollup;
}) {
  const {
    totalSessions,
    sessionsWithLive,
    avgAttendancePct,
    avgNoShowPct,
    sessionsWithRecording,
  } = rollup;

  const attendanceAccent =
    avgAttendancePct >= 75 ? "green" : avgAttendancePct >= 50 ? "amber" : "red";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard
          label="Total Sessions"
          value={totalSessions}
          sub={`${sessionsWithLive} with live classroom`}
          icon={Users}
          accent="blue"
        />
        <StatCard
          label="Avg Attendance"
          value={`${avgAttendancePct}%`}
          sub={`${avgNoShowPct}% no-show rate`}
          icon={TrendingUp}
          accent={attendanceAccent}
        />
        <StatCard
          label="With Recording"
          value={sessionsWithRecording}
          sub={`of ${sessionsWithLive} live session${sessionsWithLive !== 1 ? "s" : ""}`}
          icon={Video}
          accent={sessionsWithRecording > 0 ? "violet" : undefined}
        />
      </div>
    </div>
  );
}
