"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { GraduationCap, Loader2 } from "lucide-react";

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

import { convertLead } from "@/app/(app)/leads/actions";
import { REGISTRATION_STATUSES } from "@/lib/schemas/registration";
import type { RegistrationStatus } from "@/lib/schemas/registration";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

export interface ConvertibleLead {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  courseId: string | null;
  courseName: string | null;
}

export interface SessionForConvert {
  id: string;
  title: string | null;
  startDate: Date;
  endDate: Date;
  city: string | null;
  seatsTaken: number;
  capacity: number;
}

export function ConvertLeadDialog({
  open,
  onOpenChange,
  lead,
  sessions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: ConvertibleLead;
  sessions: SessionForConvert[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const [alsoRegister, setAlsoRegister] = React.useState(true);
  const [sessionId, setSessionId] = React.useState("");
  const [status, setStatus] = React.useState<RegistrationStatus>("CONFIRMED");
  const [notes, setNotes] = React.useState("");

  // Reset form state when the dialog closes. `open` is an external control
  // prop — resetting IS the sync we want, but the React 19 lint rule flags
  // setState in effect bodies universally. Suppressed locally with rationale.
  React.useEffect(() => {
    if (open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setAlsoRegister(true);
    setSessionId("");
    setStatus("CONFIRMED");
    setNotes("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const fullName =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "this lead";

  const chosenSession = sessions.find((s) => s.id === sessionId) ?? null;
  const seatWarning =
    chosenSession && chosenSession.seatsTaken >= chosenSession.capacity
      ? `That session is full (${chosenSession.seatsTaken}/${chosenSession.capacity}).`
      : null;

  const onSubmit = () => {
    startTransition(async () => {
      const res = await convertLead({
        leadId: lead.id,
        sessionId: alsoRegister && sessionId ? sessionId : undefined,
        registrationStatus: status,
        notes,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const linked = res.data.reused;
      const registered = !!res.data.registrationId;
      toast.success(
        linked
          ? registered
            ? "Linked to existing student & registered"
            : "Linked to existing student"
          : registered
          ? "Student created & registered"
          : "Student created"
      );
      onOpenChange(false);
      router.push(`/students/${res.data.studentId}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="size-4" />
            Convert to student
          </DialogTitle>
          <DialogDescription>
            Accept {fullName} and create a Student record. The Lead stays in
            your CRM for retargeting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {lead.email ? (
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              We&apos;ll dedupe on <strong className="text-foreground">{lead.email}</strong>
              . If a student with that email already exists, we&apos;ll link the
              lead to them instead of creating a duplicate.
            </div>
          ) : (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
              No email on this lead — a new student will be created without one.
            </div>
          )}

          <div className="rounded-md border border-border/70 bg-background p-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={alsoRegister}
                onChange={(e) => setAlsoRegister(e.target.checked)}
                className="mt-0.5 size-4 rounded border-input"
              />
              <span>
                <span className="font-medium">Register for a session now</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Off = only convert; you can register them later from their
                  workspace.
                </span>
              </span>
            </label>
          </div>

          {alsoRegister ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">
                  Session {lead.courseName ? `for ${lead.courseName}` : ""}
                </label>
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.length === 0 ? (
                      <div className="px-2 py-3 text-xs text-muted-foreground">
                        No upcoming sessions
                        {lead.courseName ? ` for ${lead.courseName}` : ""}. Add
                        one first.
                      </div>
                    ) : (
                      sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {format(s.startDate, "MMM d, yyyy")}
                          {s.title ? ` — ${s.title}` : ""}
                          {s.city ? ` · ${s.city}` : ""}
                          <span className="ms-2 text-xs text-muted-foreground">
                            {s.seatsTaken}/{s.capacity}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {seatWarning ? (
                  <p className="text-xs text-destructive">{seatWarning}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">
                  Registration status
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

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">
                  Notes (optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ) : null}
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
            disabled={pending || (alsoRegister && (!sessionId || !!seatWarning))}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            {alsoRegister ? "Convert & register" : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
