"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createRegistration } from "@/app/(app)/registrations/actions";
import {
  REGISTRATION_STATUSES,
  type RegistrationStatus,
} from "@/lib/schemas/registration";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

interface SessionOption {
  id: string;
  title?: string | null;
  courseName: string;
  startDate: Date;
  endDate: Date;
  city?: string | null;
  seatsTaken: number;
  capacity: number;
}

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

// One dialog, three contexts:
//  - `mode: "student-first"` — student is fixed, staff picks a session
//  - `mode: "session-first"` — session is fixed, staff picks a student
//  - `mode: "both-fixed"`    — both known (used by lead conversion)
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered?: (id: string) => void;
} & (
  | {
      mode: "student-first";
      student: StudentOption;
      sessions: SessionOption[];
    }
  | {
      mode: "session-first";
      session: SessionOption;
      students: StudentOption[];
    }
  | {
      mode: "both-fixed";
      student: StudentOption;
      session: SessionOption;
    }
);

const displayStudent = (s: StudentOption) =>
  [s.firstName, s.lastName].filter(Boolean).join(" ") ||
  s.email ||
  "Unnamed student";

const displaySession = (s: SessionOption) => {
  const when = format(s.startDate, "MMM d, yyyy");
  const suffix = s.title ? ` — ${s.title}` : "";
  return `${s.courseName} · ${when}${suffix}`;
};

export function RegisterStudentDialog(props: Props) {
  const { open, onOpenChange, onRegistered } = props;
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const [studentId, setStudentId] = React.useState<string>(() =>
    "student" in props ? props.student.id : ""
  );
  const [sessionId, setSessionId] = React.useState<string>(() =>
    "session" in props ? props.session.id : ""
  );
  const [status, setStatus] = React.useState<RegistrationStatus>("CONFIRMED");
  const [notes, setNotes] = React.useState("");

  // Reset on close. Legitimate external-state sync; rule disabled locally.
  React.useEffect(() => {
    if (open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setStatus("CONFIRMED");
    setNotes("");
    if (props.mode !== "student-first" && props.mode !== "both-fixed") {
      setStudentId("");
    }
    if (props.mode !== "session-first" && props.mode !== "both-fixed") {
      setSessionId("");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chosenSession =
    props.mode === "session-first" || props.mode === "both-fixed"
      ? props.session
      : props.mode === "student-first"
      ? props.sessions.find((s) => s.id === sessionId) ?? null
      : null;

  const chosenStudent =
    props.mode === "student-first" || props.mode === "both-fixed"
      ? props.student
      : props.mode === "session-first"
      ? props.students.find((s) => s.id === studentId) ?? null
      : null;

  const seatWarning =
    chosenSession && chosenSession.seatsTaken >= chosenSession.capacity
      ? `Session is full (${chosenSession.seatsTaken}/${chosenSession.capacity}).`
      : null;

  const onSubmit = () => {
    if (!studentId || !sessionId) return;
    startTransition(async () => {
      const res = await createRegistration({
        studentId,
        sessionId,
        status,
        notes,
        source: props.mode === "session-first" ? "Manual (staff)" : "",
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Student registered");
      onOpenChange(false);
      router.refresh();
      if (onRegistered) onRegistered(res.data.id);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register student</DialogTitle>
          <DialogDescription>
            {chosenStudent
              ? `Register ${displayStudent(chosenStudent)} for a session.`
              : chosenSession
              ? `Pick a student to register for ${displaySession(chosenSession)}.`
              : "Pick a student and a session."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Student — locked or picker */}
          {props.mode === "session-first" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                Student
              </label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a student" />
                </SelectTrigger>
                <SelectContent>
                  {props.students.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground">
                      No students yet — create one first.
                    </div>
                  ) : (
                    props.students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {displayStudent(s)}
                        {s.email ? (
                          <span className="ms-2 text-xs text-muted-foreground">
                            {s.email}
                          </span>
                        ) : null}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : chosenStudent ? (
            <LockedRow label="Student" value={displayStudent(chosenStudent)} />
          ) : null}

          {/* Session — locked or picker */}
          {props.mode === "student-first" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                Course Run
              </label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a course run" />
                </SelectTrigger>
                <SelectContent>
                  {props.sessions.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground">
                      No upcoming course runs — create one first.
                    </div>
                  ) : (
                    props.sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {displaySession(s)}
                        <span className="ms-2 text-xs text-muted-foreground">
                          {s.seatsTaken}/{s.capacity}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : chosenSession ? (
            <LockedRow label="Course Run" value={displaySession(chosenSession)} />
          ) : null}

          {/* Seat hint */}
          {chosenSession ? (
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Seats: </span>
              <span className="font-medium tabular-nums">
                {chosenSession.seatsTaken}/{chosenSession.capacity}
              </span>
              {seatWarning ? (
                <span className="ms-2 text-destructive">{seatWarning}</span>
              ) : null}
            </div>
          ) : null}

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              Status
            </label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as RegistrationStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGISTRATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              Notes (optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything the team should know about this registration…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={pending || !studentId || !sessionId || !!seatWarning}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LockedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
