"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { SessionsToolbar } from "./sessions-toolbar";
import { SessionsTable } from "./sessions-table";
import { SessionSheet } from "./session-sheet";
import type {
  CoursePickerItem,
  InstructorPickerItem,
  SessionRow,
} from "./actions";
import { RegisterStudentDialog } from "@/components/shared/register-student-dialog";
import { TakeAttendanceDialog } from "@/components/shared/take-attendance-dialog";

const newParam = parseAsString.withOptions({ clearOnDefault: true }).withDefault("");

interface StudentPickerItem {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

export function SessionsClient({
  rows,
  total,
  courses,
  instructors,
  students,
}: {
  rows: SessionRow[];
  total: number;
  courses: CoursePickerItem[];
  instructors: InstructorPickerItem[];
  students: StudentPickerItem[];
}) {
  const [rawNew, setRawNew] = useQueryState("new", newParam);
  const newOpen = rawNew === "1";
  const setNewOpen = (open: boolean) => {
    void setRawNew(open ? "1" : "", { scroll: false });
  };

  const [editing, setEditing] = React.useState<SessionRow | null>(null);
  const [registerFor, setRegisterFor] = React.useState<SessionRow | null>(null);
  const [attendanceFor, setAttendanceFor] = React.useState<SessionRow | null>(
    null
  );

  return (
    <>
      <SessionsToolbar
        total={total}
        onNewSession={() => setNewOpen(true)}
        courses={courses}
      />
      <SessionsTable
        rows={rows}
        total={total}
        onNewSession={() => setNewOpen(true)}
        onEditSession={setEditing}
        onRegisterStudent={setRegisterFor}
        onTakeAttendance={setAttendanceFor}
      />
      <SessionSheet
        mode="create"
        open={newOpen}
        onOpenChange={setNewOpen}
        courses={courses}
        instructors={instructors}
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
            courseName: registerFor.course.name,
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
    </>
  );
}
