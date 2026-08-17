"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/primitives/status-badge";
import { cn } from "@/lib/utils";
import {
  getAvailableSessionsForLead,
  assignLeadSession,
  removeLeadSession,
  type AvailableSession,
} from "../actions";

function seatLabel(taken: number, capacity: number): { label: string; tone: "success" | "warning" | "danger" } {
  const available = capacity - taken;
  const pct = taken / capacity;
  if (pct >= 1) return { label: "Full", tone: "danger" };
  if (pct >= 0.8) return { label: `${available} seats left`, tone: "warning" };
  return { label: `${available} seats available`, tone: "success" };
}

function SessionCard({
  session,
  selected,
  onSelect,
  disabled,
}: {
  session: AvailableSession;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const isFull = session.seatsTaken >= session.capacity;
  const { label, tone } = seatLabel(session.seatsTaken, session.capacity);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || isFull}
      className={cn(
        "w-full rounded-lg border p-4 text-start transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30",
        (disabled || isFull) && "pointer-events-none opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {selected ? (
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
            ) : null}
            <span className="text-sm font-semibold">
              {session.courseName}
            </span>
          </div>
          {session.title ? (
            <p className="text-xs text-muted-foreground">{session.title}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              {format(new Date(session.startDate), "d MMM yyyy")}
              {session.endDate &&
              format(new Date(session.endDate), "d MMM yyyy") !==
                format(new Date(session.startDate), "d MMM yyyy")
                ? ` → ${format(new Date(session.endDate), "d MMM")}`
                : null}
            </span>
            {session.city || session.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {session.city ?? session.location}
              </span>
            ) : null}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
            tone === "success" && "bg-success/10 text-success",
            tone === "warning" && "bg-warning/10 text-warning",
            tone === "danger" && "bg-destructive/10 text-destructive"
          )}
        >
          {label}
        </span>
      </div>
    </button>
  );
}

export function SessionSelectorDialog({
  leadId,
  currentSessionId,
  trigger,
}: {
  leadId: string;
  currentSessionId: string | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [sessions, setSessions] = React.useState<AvailableSession[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(currentSessionId);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    getAvailableSessionsForLead(leadId)
      .then(setSessions)
      .catch(() => toast.error("Couldn't load sessions."))
      .finally(() => setLoading(false));
  }, [open, leadId]);

  async function handleConfirm() {
    if (!selected || selected === currentSessionId) {
      setOpen(false);
      return;
    }
    setSaving(true);
    const res = await assignLeadSession(leadId, selected);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Session assigned to lead");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select a Session</DialogTitle>
          <DialogDescription>
            Choose the course session this lead will attend. You can change it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto py-1 pe-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No upcoming sessions available for this course.
            </p>
          ) : (
            sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                selected={selected === s.id}
                onSelect={() => setSelected(s.id)}
                disabled={saving}
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected || saving}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirm Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveSessionButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleRemove() {
    startTransition(async () => {
      const res = await removeLeadSession(leadId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Session removed");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      title="Remove session assignment"
    >
      {pending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <X className="size-3" />
      )}
      Remove
    </button>
  );
}
