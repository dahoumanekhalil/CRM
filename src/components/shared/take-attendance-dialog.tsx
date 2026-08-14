"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarDays,
  ClipboardCheck,
  Loader2,
  UserRound,
} from "lucide-react";

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
import { cn } from "@/lib/utils";

import {
  getSessionRosterForDate,
  recordAttendance,
  type SessionRoster,
} from "@/app/(app)/attendance/actions";
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@/lib/schemas/attendance";

const STATUS_TONE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-success text-success-foreground",
  ABSENT: "bg-destructive text-destructive-foreground",
  LATE: "bg-warning text-warning-foreground",
  EXCUSED: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};

const STATUS_INITIAL: Record<AttendanceStatus, string> = {
  PRESENT: "P",
  ABSENT: "A",
  LATE: "L",
  EXCUSED: "E",
};

interface Draft {
  registrationId: string;
  status: AttendanceStatus;
  notes: string;
}

function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pickDefaultDate(days: string[]): string {
  if (days.length === 0) return todayIsoDate();
  const todayStr = todayIsoDate();
  if (days.includes(todayStr)) return todayStr;
  // If today's not in-range, default to the first day the session runs.
  return days[0];
}

export function TakeAttendanceDialog({
  open,
  onOpenChange,
  sessionId,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  // Optional preselected date (yyyy-MM-dd). Falls back to today or first day.
  initialDate?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [roster, setRoster] = React.useState<SessionRoster | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string>("");
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [pending, startTransition] = React.useTransition();

  // One effect handles both first load and day-change reloads. selectedDate
  // starts empty; we probe with today/initialDate, refine to the right day
  // if needed (which re-triggers this effect via setSelectedDate).
  React.useEffect(() => {
    if (!open || !sessionId) return;
    const controller = new AbortController();
    const dateToUse = selectedDate || initialDate || todayIsoDate();
    (async () => {
      setLoading(true);
      try {
        const data = await getSessionRosterForDate(sessionId, dateToUse);
        if (controller.signal.aborted || !data) return;
        if (!selectedDate) {
          const chosen = data.session.days.includes(dateToUse)
            ? dateToUse
            : pickDefaultDate(data.session.days);
          if (chosen !== dateToUse) {
            // Wrong day — re-trigger with the right one. No roster set yet.
            setSelectedDate(chosen);
            return;
          }
          setRoster(data);
          setSelectedDate(chosen);
        } else {
          setRoster(data);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId, selectedDate]);

  // Reset dialog state on close.
  React.useEffect(() => {
    if (open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setRoster(null);
    setSelectedDate("");
    setDrafts({});
    setLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  // Seed drafts from roster whenever the day changes.
  React.useEffect(() => {
    if (!roster) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    const initial: Record<string, Draft> = {};
    for (const e of roster.entries) {
      initial[e.registrationId] = {
        registrationId: e.registrationId,
        status: (e.existingStatus as AttendanceStatus) ?? "PRESENT",
        notes: e.existingNotes ?? "",
      };
    }
    setDrafts(initial);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [roster]);

  const setDraftStatus = (registrationId: string, status: AttendanceStatus) => {
    setDrafts((prev) => ({
      ...prev,
      [registrationId]: {
        ...(prev[registrationId] ?? { registrationId, notes: "" }),
        registrationId,
        status,
      },
    }));
  };

  const setDraftNotes = (registrationId: string, notes: string) => {
    setDrafts((prev) => ({
      ...prev,
      [registrationId]: {
        ...(prev[registrationId] ?? { registrationId, status: "PRESENT" }),
        registrationId,
        notes,
      },
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    if (!roster) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const e of roster.entries) {
        next[e.registrationId] = {
          registrationId: e.registrationId,
          status,
          notes: next[e.registrationId]?.notes ?? "",
        };
      }
      return next;
    });
  };

  const summary = React.useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };
    for (const d of Object.values(drafts)) {
      counts[d.status] += 1;
    }
    return counts;
  }, [drafts]);

  const onSubmit = () => {
    if (!roster || !selectedDate) return;
    startTransition(async () => {
      const entries = Object.values(drafts);
      const res = await recordAttendance({
        sessionId: roster.session.id,
        sessionDate: selectedDate,
        entries: entries.map((e) => ({
          registrationId: e.registrationId,
          status: e.status,
          notes: e.notes,
        })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Attendance saved · ${summary.PRESENT + summary.LATE}/${entries.length} attended`
      );
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-4" /> Take attendance
          </DialogTitle>
          <DialogDescription>
            {roster
              ? `${roster.session.courseName}${
                  roster.session.title ? ` · ${roster.session.title}` : ""
                }`
              : "Loading roster…"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date picker (only for multi-day sessions) */}
          {roster && roster.session.days.length > 1 ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                <CalendarDays className="me-1 inline size-3.5 -translate-y-px" />
                Session day
              </label>
              <div className="flex flex-wrap gap-1.5">
                {roster.session.days.map((day) => {
                  const active = day === selectedDate;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium tabular-nums transition-colors",
                        active
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      {format(new Date(`${day}T00:00`), "EEE, MMM d")}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Summary + quick actions */}
          {roster && !loading ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {ATTENDANCE_STATUSES.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground"
                  >
                    <span
                      className={cn(
                        "grid size-4 place-items-center rounded-sm text-[10px] font-bold",
                        STATUS_TONE[s]
                      )}
                    >
                      {STATUS_INITIAL[s]}
                    </span>
                    <span>{summary[s]}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAll("PRESENT")}
                  className="h-7 px-2 text-xs"
                >
                  Mark all present
                </Button>
              </div>
            </div>
          ) : null}

          {/* Roster */}
          <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border/60">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="me-2 size-4 animate-spin" /> Loading roster…
              </div>
            ) : roster && roster.entries.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No registered students for this session yet.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {roster?.entries.map((e) => {
                  const draft =
                    drafts[e.registrationId] ??
                    ({
                      registrationId: e.registrationId,
                      status: "PRESENT" as AttendanceStatus,
                      notes: "",
                    } satisfies Draft);
                  const studentName =
                    [e.student.firstName, e.student.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    e.student.email ||
                    "Unnamed";
                  return (
                    <li
                      key={e.registrationId}
                      className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          <UserRound className="size-3.5" />
                        </span>
                        <div className="min-w-0 space-y-1">
                          <div className="truncate text-sm font-medium">
                            {studentName}
                          </div>
                          {e.student.email ? (
                            <div className="truncate text-xs text-muted-foreground">
                              {e.student.email}
                            </div>
                          ) : null}
                          {draft.status === "ABSENT" ||
                          draft.status === "EXCUSED" ||
                          draft.status === "LATE" ? (
                            <Textarea
                              rows={1}
                              value={draft.notes}
                              placeholder="Note (optional)"
                              onChange={(ev) =>
                                setDraftNotes(e.registrationId, ev.target.value)
                              }
                              className="mt-1 min-h-8 py-1 text-xs"
                            />
                          ) : null}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-background p-0.5 self-start">
                        {ATTENDANCE_STATUSES.map((s) => {
                          const active = draft.status === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() =>
                                setDraftStatus(e.registrationId, s)
                              }
                              className={cn(
                                "h-7 rounded px-2 text-[11px] font-medium transition-colors",
                                active
                                  ? STATUS_TONE[s]
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {STATUS_LABEL[s]}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
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
            disabled={
              pending || loading || !roster || roster.entries.length === 0
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            Save attendance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
