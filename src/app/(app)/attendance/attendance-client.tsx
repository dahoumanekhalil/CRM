"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { format } from "date-fns";
import { CalendarDays, ClipboardCheck, MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/primitives/search-input";
import { StatusBadge } from "@/components/primitives/status-badge";
import { EmptyState } from "@/components/primitives/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TakeAttendanceDialog } from "@/components/shared/take-attendance-dialog";

import { attendanceFilters } from "./attendance-filters";
import type {
  AttendanceCoursePickerItem,
  AttendanceListRow,
} from "./actions";

const WHEN_TABS = [
  { value: "ALL" as const, label: "All" },
  { value: "TODAY" as const, label: "Today" },
  { value: "IN_PROGRESS" as const, label: "In progress" },
  { value: "UPCOMING" as const, label: "This week" },
  { value: "PAST" as const, label: "Past 2 weeks" },
];

const GROUP_ORDER = ["today", "in-progress", "upcoming", "past"] as const;
const GROUP_LABEL: Record<(typeof GROUP_ORDER)[number], string> = {
  today: "Today",
  "in-progress": "In progress",
  upcoming: "Upcoming",
  past: "Past",
};

export function AttendanceClient({
  rows,
  courses,
}: {
  rows: AttendanceListRow[];
  courses: AttendanceCoursePickerItem[];
}) {
  const [filters, setFilters] = useQueryStates(attendanceFilters);
  const [takingFor, setTakingFor] = React.useState<AttendanceListRow | null>(
    null
  );

  const hasActiveFilters =
    filters.q !== "" || filters.courseId !== "" || filters.when !== "ALL";

  // Group by priority for the "smart order" view.
  const groups: Partial<Record<(typeof GROUP_ORDER)[number], AttendanceListRow[]>> = {};
  for (const r of rows) {
    (groups[r.priority] = groups[r.priority] ?? []).push(r);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 sm:max-w-xl">
          <SearchInput
            containerClassName="flex-1"
            value={filters.q}
            onChange={(v) => setFilters({ q: v })}
            placeholder="Search by course, city, session title…"
          />
          <Select
            value={filters.courseId || "__all"}
            onValueChange={(v) =>
              setFilters({ courseId: v === "__all" ? "" : v })
            }
          >
            <SelectTrigger size="sm" className="h-9 w-[180px] shrink-0">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setFilters({ q: "", courseId: "", when: "ALL" })
              }
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}
        </div>
      </div>

      {/* When tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {WHEN_TABS.map((tab) => {
          const active = filters.when === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilters({ when: tab.value })}
              className={cn(
                "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={
            hasActiveFilters ? "No sessions match your filters" : "Nothing to take attendance for"
          }
          description={
            hasActiveFilters
              ? "Try clearing filters or picking a different course."
              : "Attendance shows up here once you have upcoming, in-progress or recently completed sessions with registered students."
          }
          action={
            hasActiveFilters ? (
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({ q: "", courseId: "", when: "ALL" })
                }
              >
                Clear filters
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/sessions?new=1">Create a session</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {GROUP_ORDER.map((key) => {
            const items = groups[key];
            if (!items || items.length === 0) return null;
            return (
              <section key={key} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {GROUP_LABEL[key]}{" "}
                  <span className="ms-1 tabular-nums opacity-70">
                    {items.length}
                  </span>
                </h2>
                <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
                  {items.map((s) => (
                    <SessionRow
                      key={s.id}
                      row={s}
                      onTakeAttendance={() => setTakingFor(s)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <TakeAttendanceDialog
        open={!!takingFor}
        onOpenChange={(open) => {
          if (!open) setTakingFor(null);
        }}
        sessionId={takingFor?.id ?? null}
      />
    </div>
  );
}

function SessionRow({
  row,
  onTakeAttendance,
}: {
  row: AttendanceListRow;
  onTakeAttendance: () => void;
}) {
  const dateLabel =
    row.days.length === 1
      ? format(row.startDate, "EEE, MMM d")
      : `${format(row.startDate, "MMM d")} – ${format(row.endDate, "MMM d, yyyy")}`;
  const where =
    [row.city, row.country].filter(Boolean).join(", ") || row.location || null;
  const canTake = row.registrations > 0;

  return (
    <li className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
          <CalendarDays className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/courses/${row.course.slug}`}
              className="truncate text-sm font-medium hover:underline"
            >
              {row.course.name}
              {row.title ? (
                <span className="text-muted-foreground"> · {row.title}</span>
              ) : null}
            </Link>
            <StatusBadge status={row.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="tabular-nums">{dateLabel}</span>
            {where ? (
              <>
                <span aria-hidden className="opacity-40">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" /> {where}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-end text-xs tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">
            {row.registrations}
          </span>{" "}
          registered
          {row.priority === "today" && row.registrations > 0 ? (
            <span className="ms-2 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5">
              {row.todayPresent}/{row.registrations} attended today
            </span>
          ) : null}
        </div>
        <Button
          size="sm"
          onClick={onTakeAttendance}
          disabled={!canTake}
          title={!canTake ? "No registered students yet" : undefined}
        >
          <ClipboardCheck /> Take attendance
        </Button>
      </div>
    </li>
  );
}
