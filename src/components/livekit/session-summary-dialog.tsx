"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart3, Clock, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SessionEndSummary } from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// 26.1 — Post-session summary dialog shown immediately after trainer ends the session.
export function SessionSummaryDialog({
  open,
  onClose,
  summary,
  recordingProcessing,
  courseSlug,
  sessionId,
}: {
  open: boolean;
  onClose: () => void;
  summary: SessionEndSummary;
  recordingProcessing: boolean;
  courseSlug: string;
  sessionId: string;
}) {
  const sessionUrl = `/courses/${courseSlug}/sessions/${sessionId}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Session Complete</DialogTitle>
          <DialogDescription>
            Here&apos;s a quick summary of how the session went.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 my-1">
          <StatBox
            icon={<Clock className="size-3.5" />}
            label="Duration"
            value={formatDuration(summary.durationSeconds)}
          />
          <StatBox
            icon={<Users className="size-3.5" />}
            label="Participants"
            value={String(summary.totalJoins)}
          />
          <StatBox
            icon={<BarChart3 className="size-3.5" />}
            label="Attendance"
            value={`${summary.attendancePct}%`}
            valueClass={
              summary.attendancePct >= 75
                ? "text-green-600 dark:text-green-400"
                : summary.attendancePct >= 50
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"
            }
          />
          <StatBox
            icon={<Play className="size-3.5" />}
            label="Recording"
            value={recordingProcessing ? "Processing…" : "Not recorded"}
            valueClass={
              recordingProcessing
                ? "text-blue-600 dark:text-blue-400 text-sm"
                : "text-muted-foreground text-sm"
            }
          />
        </div>

        {summary.attendanceSynced > 0 && (
          <p className="text-xs text-muted-foreground">
            {summary.attendanceSynced} registration
            {summary.attendanceSynced !== 1 ? "s" : ""} automatically marked as complete.
          </p>
        )}

        {/* 26.3 — Next steps */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
          <Button size="sm" variant="outline" asChild>
            <Link href={`${sessionUrl}?tab=students`}>View Attendance</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`${sessionUrl}?tab=live`}>Session Analytics</Link>
          </Button>
          <Button size="sm" onClick={onClose} className="ms-auto">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={cn("text-xl font-semibold leading-none", valueClass)}>{value}</p>
    </div>
  );
}
