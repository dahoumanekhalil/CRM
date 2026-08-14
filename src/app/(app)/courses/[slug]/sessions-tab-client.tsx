"use client";

import * as React from "react";
import {
  CalendarDays,
  ClipboardCheck,
  MapPin,
  Pencil,
  Plus,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";

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

export function CourseSessionsTabClient({
  courseId,
  courseName,
  sessions,
  courses,
  instructors,
  students,
}: {
  courseId: string;
  courseName: string;
  sessions: CourseSessionRow[];
  courses: CoursePickerItem[];
  instructors: InstructorPickerItem[];
  students: StudentPickerItem[];
}) {
  const [newOpen, setNewOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CourseSessionRow | null>(null);
  const [registerFor, setRegisterFor] = React.useState<CourseSessionRow | null>(
    null
  );
  const [attendanceFor, setAttendanceFor] =
    React.useState<CourseSessionRow | null>(null);

  if (sessions.length === 0) {
    return (
      <>
        <EmptyState
          icon={CalendarDays}
          title="No sessions for this course yet"
          description="A session is a scheduled cohort with real dates, location and capacity. Students register for a specific session."
          action={
            <Button onClick={() => setNewOpen(true)}>
              <Plus /> Add session
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Sessions for {courseName}
          </h2>
          <p className="text-xs text-muted-foreground">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
          </p>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus /> Add session
        </Button>
      </div>

      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
        {sessions.map((s) => (
          <li key={s.id} className="group grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
                <CalendarDays className="size-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {s.title?.trim() || courseName}
                  </span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {formatSessionDates(s.startDate, s.endDate)}
                  </span>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="tabular-nums">
                    {formatSessionTime(s.startDate, s.endDate)}
                  </span>
                  {(s.city || s.country || s.location) && (
                    <>
                      <span aria-hidden className="opacity-40">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="size-3" />
                        {[s.city, s.country].filter(Boolean).join(", ") ||
                          s.location}
                      </span>
                    </>
                  )}
                  {s.instructor ? (
                    <>
                      <span aria-hidden className="opacity-40">
                        ·
                      </span>
                      <span className="truncate">
                        {[s.instructor.firstName, s.instructor.lastName]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span className="text-sm tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">
                  {s._count.registrations}
                </span>
                /{s.capacity}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttendanceFor(s)}
                disabled={s._count.registrations === 0}
                title={
                  s._count.registrations === 0
                    ? "No registered students yet"
                    : undefined
                }
              >
                <ClipboardCheck /> Attendance
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRegisterFor(s)}
              >
                <UserPlus /> Register
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(s)}
              >
                <Pencil /> Edit
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {/* Next session hint */}
      {sessions.some((s) => s.startDate > new Date()) ? (
        <p className="text-xs text-muted-foreground">
          Next up:{" "}
          {(() => {
            const next = sessions
              .filter((s) => s.startDate > new Date())
              .sort(
                (a, b) => a.startDate.getTime() - b.startDate.getTime()
              )[0];
            return next ? format(next.startDate, "EEE, MMM d 'at' HH:mm") : "—";
          })()}
        </p>
      ) : null}

      <SessionSheet
        mode="create"
        open={newOpen}
        onOpenChange={setNewOpen}
        courses={courses}
        instructors={instructors}
        lockedCourseId={courseId}
      />
      {editing ? (
        <SessionSheet
          mode="edit"
          session={editing}
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          courses={courses}
          instructors={instructors}
          lockedCourseId={courseId}
        />
      ) : null}
      {registerFor ? (
        <RegisterStudentDialog
          mode="session-first"
          open={!!registerFor}
          onOpenChange={(open) => {
            if (!open) setRegisterFor(null);
          }}
          session={{
            id: registerFor.id,
            title: registerFor.title,
            courseName: courseName,
            startDate: registerFor.startDate,
            endDate: registerFor.endDate,
            city: registerFor.city,
            capacity: registerFor.capacity,
            seatsTaken: registerFor._count.registrations,
          }}
          students={students}
        />
      ) : null}
      <TakeAttendanceDialog
        open={!!attendanceFor}
        onOpenChange={(open) => {
          if (!open) setAttendanceFor(null);
        }}
        sessionId={attendanceFor?.id ?? null}
      />
    </div>
  );
}
