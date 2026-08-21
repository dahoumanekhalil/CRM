"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Clock,
  MapPin,
  Pencil,
  Plus,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import { SessionSheet } from "../../sessions/session-sheet";
import { RegisterStudentDialog } from "@/components/shared/register-student-dialog";
import { TakeAttendanceDialog } from "@/components/shared/take-attendance-dialog";
import type {
  CoursePickerItem,
  CourseSessionRow,
  InstructorPickerItem,
} from "../../sessions/actions";
import {
  formatSessionDates,
  formatSessionTime,
} from "../../sessions/sessions-table";

interface StudentPickerItem {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

// ─── Session status colors ────────────────────────────────────────────────────

const SESSION_STATUS_BG: Record<string, string> = {
  UPCOMING:    "border-blue-200 bg-blue-50/50 dark:border-blue-800/60 dark:bg-blue-950/20",
  OPEN:        "border-green-200 bg-green-50/50 dark:border-green-800/60 dark:bg-green-950/20",
  FULL:        "border-amber-200 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/20",
  IN_PROGRESS: "border-violet-200 bg-violet-50/50 dark:border-violet-800/60 dark:bg-violet-950/20",
  COMPLETED:   "border-border/60 bg-muted/20",
  CANCELLED:   "border-border/40 bg-muted/10 opacity-60",
  DRAFT:       "border-dashed border-border/60 bg-muted/10",
};

function sessionBg(status: string) {
  return SESSION_STATUS_BG[status] ?? SESSION_STATUS_BG.UPCOMING;
}

// ─── Capacity bar ─────────────────────────────────────────────────────────────

function CapacityBar({ taken, capacity }: { taken: number; capacity: number | null }) {
  if (!capacity) return null;
  const pct = Math.min((taken / capacity) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-xs text-muted-foreground">
        {taken}/{capacity}
      </span>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({
  s,
  courseSlug,
  displayName,
  onEdit,
  onRegister,
  onAttendance,
}: {
  s: CourseSessionRow;
  courseSlug: string;
  displayName: string;
  onEdit: () => void;
  onRegister: () => void;
  onAttendance: () => void;
}) {
  const t = useT();
  const enrolled = s._count.registrations;
  const instructor = s.instructor
    ? [s.instructor.firstName, s.instructor.lastName].filter(Boolean).join(" ")
    : null;
  const location =
    [s.city, s.country].filter(Boolean).join(", ") || s.location || null;

  return (
    <li className={cn(
      "group relative overflow-hidden rounded-xl border transition-shadow hover:shadow-sm",
      sessionBg(s.status)
    )}>
      {/* Clickable overlay → roster */}
      <Link
        href={`/courses/${courseSlug}/sessions/${s.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Open roster for ${displayName}`}
      />

      {/* pointer-events-none lets clicks pass through to the overlay Link */}
      <div className="relative z-10 flex flex-col gap-3 p-4 pointer-events-none">
        {/* Top row: title + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold leading-tight">
              {displayName}
            </h3>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {formatSessionDates(s.startDate, s.endDate)}
            </p>
          </div>
          <StatusBadge status={s.status} className="shrink-0" />
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3 shrink-0" />
            {formatSessionTime(s.startDate, s.endDate)}
          </span>
          {location && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="size-3 shrink-0" />
              {location}
            </span>
          )}
          {instructor && (
            <span className="inline-flex items-center gap-1 truncate">
              <User className="size-3 shrink-0" />
              {instructor}
            </span>
          )}
        </div>

        {/* Footer: capacity + action buttons */}
        <div className="flex items-center justify-between gap-2 border-t border-black/5 pt-2.5 dark:border-white/5">
          <div className="flex items-center gap-3">
            {s.capacity ? (
              <CapacityBar taken={enrolled} capacity={s.capacity} />
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                <span className="font-medium text-foreground">{enrolled}</span> {t("enrolled")}
              </span>
            )}
          </div>

          {/* Restore pointer-events on buttons so they remain clickable */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 bg-background/80 px-2 text-xs"
              onClick={onAttendance}
              disabled={enrolled === 0}
              title={enrolled === 0 ? "No registered students yet" : undefined}
            >
              <ClipboardCheck className="size-3.5" />
              {t("Attendance")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 bg-background/80 px-2 text-xs"
              onClick={onRegister}
            >
              <UserPlus className="size-3.5" />
              {t("Register")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 bg-background/60"
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* "View roster" hover hint */}
        <div className="flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          <CalendarDays className="size-3" />
          {t("View students & attendance")}
          <ChevronRight className="size-3" />
        </div>
      </div>
    </li>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function CourseSessionsTabClient({
  courseId,
  courseSlug,
  courseName,
  sessions,
  courses,
  instructors,
  students,
}: {
  courseId: string;
  courseSlug: string;
  courseName: string;
  sessions: CourseSessionRow[];
  courses: CoursePickerItem[];
  instructors: InstructorPickerItem[];
  students: StudentPickerItem[];
}) {
  const t = useT();
  const [newOpen, setNewOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CourseSessionRow | null>(null);
  const [registerFor, setRegisterFor] = React.useState<CourseSessionRow | null>(null);
  const [attendanceFor, setAttendanceFor] = React.useState<CourseSessionRow | null>(null);

  if (sessions.length === 0) {
    return (
      <>
        <EmptyState
          icon={CalendarDays}
          title={t("No course runs yet")}
          description={t("A course run is a scheduled cohort with real dates, location, and capacity. Students register for a specific run.")}
          action={
            <Button onClick={() => setNewOpen(true)}>
              <Plus /> {t("Add first course run")}
            </Button>
          }
        />
        <SessionSheet
          mode="create"
          open={newOpen}
          onOpenChange={setNewOpen}
          courses={courses}
          instructors={instructors}
          lockedCourseId={courseId}
        />
      </>
    );
  }

  // Sort all sessions by startDate ascending → assign G1, G2, G3... consistently
  const sorted = [...sessions].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const groupLabel = (s: CourseSessionRow) => {
    const idx = sorted.findIndex((x) => x.id === s.id);
    return `${courseName} G${idx + 1}`;
  };

  // Separate upcoming/active from completed (preserving sorted order within each group)
  const active = sorted.filter((s) => !["COMPLETED", "CANCELLED"].includes(s.status));
  const past = sorted.filter((s) => ["COMPLETED", "CANCELLED"].includes(s.status));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{sessions.length}</span>{" "}
          {sessions.length === 1 ? t("run") : t("runs")} · {t("click a card to open its student roster")}
        </p>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus /> {t("Add course run")}
        </Button>
      </div>

      {/* Active / upcoming sessions */}
      {active.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {active.map((s) => (
            <SessionCard
              key={s.id}
              s={s}
              courseSlug={courseSlug}
              displayName={groupLabel(s)}
              onEdit={() => setEditing(s)}
              onRegister={() => setRegisterFor(s)}
              onAttendance={() => setAttendanceFor(s)}
            />
          ))}
        </ul>
      )}

      {/* Past / completed sessions */}
      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("Past groups")}
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {past.map((s) => (
              <SessionCard
                key={s.id}
                s={s}
                courseSlug={courseSlug}
                displayName={groupLabel(s)}
                onEdit={() => setEditing(s)}
                onRegister={() => setRegisterFor(s)}
                onAttendance={() => setAttendanceFor(s)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Dialogs */}
      <SessionSheet
        mode="create"
        open={newOpen}
        onOpenChange={setNewOpen}
        courses={courses}
        instructors={instructors}
        lockedCourseId={courseId}
      />
      {editing && (
        <SessionSheet
          mode="edit"
          session={editing}
          open={!!editing}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
          courses={courses}
          instructors={instructors}
          lockedCourseId={courseId}
        />
      )}
      {registerFor && (
        <RegisterStudentDialog
          mode="session-first"
          open={!!registerFor}
          onOpenChange={(open) => { if (!open) setRegisterFor(null); }}
          session={{
            id: registerFor.id,
            title: registerFor.title,
            courseName,
            startDate: registerFor.startDate,
            endDate: registerFor.endDate,
            city: registerFor.city,
            capacity: registerFor.capacity,
            seatsTaken: registerFor._count.registrations,
          }}
          students={students}
        />
      )}
      <TakeAttendanceDialog
        open={!!attendanceFor}
        onOpenChange={(open) => { if (!open) setAttendanceFor(null); }}
        sessionId={attendanceFor?.id ?? null}
      />
    </div>
  );
}
