"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  RotateCcw,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/primitives/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { reassignToSession, refundNoShow } from "./actions";
import type { NoShowRow, SessionPickerItem } from "./actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, currency = "DZD") {
  if (!amount) return "—";
  return `${amount.toLocaleString("fr-DZ")} ${currency}`;
}

function initials(first: string, last: string | null) {
  return `${first[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function totalPaid(row: NoShowRow) {
  return row.payments.reduce((s, p) => s + p.amount, 0);
}

// ─── Reassign dialog ──────────────────────────────────────────────────────────

function ReassignDialog({
  row,
  sessions,
  open,
  onOpenChange,
}: {
  row: NoShowRow;
  sessions: SessionPickerItem[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [selected, setSelected] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const otherSessions = sessions.filter((s) => s.id !== row.session?.id);

  function handleConfirm() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await reassignToSession(row.id, selected);
        toast.success("Student reassigned successfully");
        onOpenChange(false);
      } catch {
        toast.error("Failed to reassign student");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign to another session</DialogTitle>
          <DialogDescription>
            Move{" "}
            <strong>
              {row.student.firstName} {row.student.lastName}
            </strong>{" "}
            to a different session. Their payments remain linked to the registration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">
              Current session
            </Label>
            <p className="mt-0.5 text-sm font-medium">
              {row.session?.course.name} —{" "}
              {row.session?.startDate
                ? format(row.session.startDate, "MMM d, yyyy")
                : "—"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">New session</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a session…" />
              </SelectTrigger>
              <SelectContent>
                {otherSessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.course.name} —{" "}
                    {format(s.startDate, "MMM d, yyyy")}
                    {s.title?.trim() ? ` (${s.title.trim()})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || pending}>
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Refund confirm dialog ─────────────────────────────────────────────────────

function RefundDialog({
  row,
  open,
  onOpenChange,
}: {
  row: NoShowRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const paid = totalPaid(row);

  function handleConfirm() {
    startTransition(async () => {
      try {
        await refundNoShow(row.id);
        toast.success("Refund recorded and registration cancelled");
        onOpenChange(false);
      } catch {
        toast.error("Failed to process refund");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refund no-show</DialogTitle>
          <DialogDescription>
            This will record a refund of{" "}
            <strong>{fmt(paid)}</strong> and cancel the registration for{" "}
            <strong>
              {row.student.firstName} {row.student.lastName}
            </strong>
            . This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Confirm refund</p>
              <p className="text-xs text-destructive/70 mt-0.5">
                A negative payment of {fmt(paid)} will be created. The registration
                status will change to Cancelled.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            Confirm refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function NoShowRowCard({
  row,
  sessions,
}: {
  row: NoShowRow;
  sessions: SessionPickerItem[];
}) {
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [refundOpen, setRefundOpen] = React.useState(false);
  const paid = totalPaid(row);
  const hasPaid = paid > 0;

  const location =
    [row.session?.city, row.session?.country].filter(Boolean).join(", ") || null;

  return (
    <>
      <li className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
            {initials(row.student.firstName, row.student.lastName)}
          </span>
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Link
                href={`/students/${row.student.id}`}
                className="truncate text-sm font-medium hover:underline"
              >
                {row.student.firstName} {row.student.lastName}
              </Link>
              {hasPaid ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Paid {fmt(paid)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  No payment
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {row.student.phone && <span>{row.student.phone}</span>}
              {row.session && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  <Link
                    href={`/courses/${row.session.course.slug}/sessions/${row.session.id}`}
                    className="hover:underline"
                  >
                    {row.session.course.name} —{" "}
                    {format(row.session.startDate, "MMM d, yyyy")}
                  </Link>
                </span>
              )}
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {location}
                </span>
              )}
              <span className="text-muted-foreground/50">
                Registered {format(row.registeredAt, "MMM d")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReassignOpen(true)}
            title="Reassign to another session"
          >
            <ArrowRightLeft className="size-3.5" />
            Reassign
          </Button>
          {hasPaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefundOpen(true)}
              className="border-destructive/40 text-destructive hover:bg-destructive/5"
              title="Issue refund"
            >
              <RotateCcw className="size-3.5" />
              Refund
            </Button>
          )}
        </div>
      </li>

      <ReassignDialog
        row={row}
        sessions={sessions}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
      />
      <RefundDialog row={row} open={refundOpen} onOpenChange={setRefundOpen} />
    </>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function NoShowsClient({
  rows,
  sessions,
}: {
  rows: NoShowRow[];
  sessions: SessionPickerItem[];
}) {
  const totalRefundable = rows
    .filter((r) => totalPaid(r) > 0)
    .reduce((s, r) => s + totalPaid(r), 0);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No no-shows"
        description="Students marked as no-show will appear here so you can issue refunds or reassign them."
        className="border-0 bg-transparent"
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <div className="text-2xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
            {rows.length}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            No-shows total
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {rows.filter((r) => totalPaid(r) > 0).length}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            With payments
          </div>
        </div>
        <div className="col-span-2 rounded-xl border border-border/60 bg-card px-4 py-3 sm:col-span-1">
          <div className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {totalRefundable > 0 ? fmt(totalRefundable) : "—"}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Pending refunds
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <header className="border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <UserX className="size-4 text-orange-600 dark:text-orange-400" />
            <h2 className="text-sm font-semibold">
              No-show students — {rows.length} across all courses
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Students who paid but did not attend. Reassign them to another date or issue a refund.
          </p>
        </header>
        <ul className="divide-y divide-border/60">
          {rows.map((row) => (
            <NoShowRowCard key={row.id} row={row} sessions={sessions} />
          ))}
        </ul>
      </div>
    </div>
  );
}
