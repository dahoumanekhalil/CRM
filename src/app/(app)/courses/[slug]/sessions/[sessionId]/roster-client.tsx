"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Check,
  X,
  Plus,
  Loader2,
  DollarSign,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  markAttendance,
  addPayment,
  setAgreedPrice,
  markNoShow,
} from "./actions";
import type { SessionRoster, RosterRow } from "./actions";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(amount: number | null, currency: string): string {
  if (amount == null || amount === 0) return "—";
  return `${amount.toLocaleString("fr-DZ")} ${currency}`;
}

function initials(first: string, last: string | null): string {
  return `${first[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function getPaymentSummary(row: RosterRow) {
  const completed = row.payments.filter((p) => p.status === "COMPLETED");
  const paid = completed.reduce((s, p) => s + p.amount, 0);
  return { paid, agreed: row.agreedPrice };
}

type PayStatus = "full" | "partial" | "none";
function payStatus(paid: number, agreed: number | null): PayStatus {
  if (paid <= 0) return "none";
  if (agreed != null && agreed > 0 && paid >= agreed) return "full";
  return "partial";
}

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "BANK_CHECK", label: "Bank check" },
  { value: "POSTAL_MOBILE", label: "Postal / Mobile" },
  { value: "CARD", label: "Card" },
  { value: "ONLINE", label: "Online" },
  { value: "OTHER", label: "Other" },
];

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({
  registrations,
  currency,
}: {
  registrations: SessionRoster["registrations"];
  currency: string;
}) {
  const enrolled = registrations.length;
  const present = registrations.filter(
    (r) => r.attendance[0]?.status === "PRESENT"
  ).length;
  const absent = registrations.filter(
    (r) => r.attendance[0]?.status === "ABSENT"
  ).length;
  const noRecord = enrolled - present - absent;

  const totalPaid = registrations.reduce((s, r) => {
    const { paid } = getPaymentSummary(r);
    return s + paid;
  }, 0);
  const totalExpected = registrations.reduce(
    (s, r) => s + (r.agreedPrice ?? 0),
    0
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "Enrolled", value: enrolled, color: "text-foreground" },
        {
          label: "Present",
          value: present,
          color: "text-green-600 dark:text-green-400",
        },
        {
          label: "Absent",
          value: absent,
          color: "text-red-600 dark:text-red-400",
        },
        {
          label: "Not marked",
          value: noRecord,
          color: "text-muted-foreground",
        },
      ].map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border/60 bg-card px-4 py-3"
        >
          <div className={cn("text-2xl font-bold tabular-nums", s.color)}>
            {s.value}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
      <div className="col-span-2 rounded-xl border border-border/60 bg-card px-4 py-3 sm:col-span-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold tabular-nums text-green-600 dark:text-green-400">
              {fmt(totalPaid, currency)}
            </span>
            {totalExpected > 0 ? (
              <span className="ms-2 text-sm text-muted-foreground">
                / {fmt(totalExpected, currency)} expected
              </span>
            ) : null}
          </div>
          {totalExpected > 0 ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${Math.min((totalPaid / totalExpected) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round((totalPaid / totalExpected) * 100)}%
              </span>
            </div>
          ) : null}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Total collected
        </div>
      </div>
    </div>
  );
}

// ─── Attendance toggle ────────────────────────────────────────────────────────

function AttendanceToggle({
  row,
  sessionId,
}: {
  row: RosterRow;
  sessionId: string;
}) {
  const current = row.attendance[0]?.status ?? null;
  const [status, setStatus] = React.useState(current);
  const [pending, startTransition] = React.useTransition();

  function toggle(next: "PRESENT" | "ABSENT") {
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      try {
        await markAttendance(row.id, sessionId, next);
      } catch {
        setStatus(prev);
        toast.error("Failed to update attendance");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => toggle("PRESENT")}
        disabled={pending}
        title="Mark present"
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md border text-sm font-medium transition-colors",
          status === "PRESENT"
            ? "border-green-500 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
            : "border-border bg-background text-muted-foreground hover:border-green-400 hover:text-green-600"
        )}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      </button>
      <button
        onClick={() => toggle("ABSENT")}
        disabled={pending}
        title="Mark absent"
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md border text-sm font-medium transition-colors",
          status === "ABSENT"
            ? "border-red-500 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
            : "border-border bg-background text-muted-foreground hover:border-red-400 hover:text-red-600"
        )}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Payment popover ──────────────────────────────────────────────────────────

function PaymentPopover({
  row,
  sessionId,
  currency,
}: {
  row: RosterRow;
  sessionId: string;
  currency: string;
}) {
  const { paid, agreed } = getPaymentSummary(row);
  const ps = payStatus(paid, agreed);
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("CASH");
  const [agreedVal, setAgreedVal] = React.useState(
    agreed != null ? String(agreed) : ""
  );
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await addPayment({
        studentId: row.student.id,
        registrationId: row.id,
        sessionId,
        amount: num,
        method,
        currency,
      });
      toast.success("Payment recorded");
      setAmount("");
      setOpen(false);
    } catch {
      toast.error("Failed to save payment");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAgreed() {
    const num = parseFloat(agreedVal);
    if (!num || num <= 0) return;
    try {
      await setAgreedPrice(row.id, sessionId, num);
    } catch {
      toast.error("Failed to update price");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            ps === "full" &&
              "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300",
            ps === "partial" &&
              "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300",
            ps === "none" &&
              "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <DollarSign className="size-3" />
          {ps === "full" && `${fmt(paid, currency)} ✓`}
          {ps === "partial" && `${fmt(paid, currency)} / ${fmt(agreed, currency)}`}
          {ps === "none" && "Not paid"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold">Add payment</p>
            <p className="text-xs text-muted-foreground">
              {row.student.firstName} {row.student.lastName}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Agreed price ({currency})</Label>
            <Input
              type="number"
              min="0"
              value={agreedVal}
              onChange={(e) => setAgreedVal(e.target.value)}
              onBlur={handleSaveAgreed}
              className="h-8 text-sm"
              placeholder="Total price negotiated"
            />
          </div>

          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs">
            Already paid:{" "}
            <span className="font-semibold text-foreground">
              {fmt(paid, currency)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">New payment amount ({currency})</Label>
            <Input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. 25000"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            size="sm"
            onClick={handleSave}
            disabled={saving || !amount}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Record payment
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── No-show button ───────────────────────────────────────────────────────────

function NoShowButton({
  row,
  sessionId,
}: {
  row: RosterRow;
  sessionId: string;
}) {
  const [pending, startTransition] = React.useTransition();
  if (row.status === "NO_SHOW") {
    return (
      <span className="text-xs text-muted-foreground italic">No-show</span>
    );
  }
  return (
    <button
      title="Mark as no-show"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await markNoShow(row.id, sessionId);
            toast.success("Marked as no-show");
          } catch {
            toast.error("Failed");
          }
        })
      }
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <UserX className="size-3.5" />
      )}
    </button>
  );
}

// ─── Main roster client ───────────────────────────────────────────────────────

export function RosterClient({
  roster,
  groupLabel,
}: {
  roster: SessionRoster;
  groupLabel?: string;
}) {
  const { registrations, id: sessionId } = roster;
  const currency = roster.course.currency || "DZD";

  if (registrations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
        <p className="text-sm font-medium">No students enrolled yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Register students from the course Sessions tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SummaryBar registrations={registrations} currency={currency} />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <header className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold">
            {groupLabel ?? "Roster"} — {registrations.length} enrolled
          </h2>
          <p className="text-xs text-muted-foreground">
            Mark attendance and record payments directly in this list
          </p>
        </header>

        <ul className="divide-y divide-border/60">
          {registrations.map((row, idx) => {
            const name = [row.student.firstName, row.student.lastName]
              .filter(Boolean)
              .join(" ");
            const attStatus = row.attendance[0]?.status ?? null;
            const rowBg =
              attStatus === "PRESENT"
                ? "bg-green-50/30 dark:bg-green-950/10"
                : attStatus === "ABSENT" || row.status === "NO_SHOW"
                ? "bg-red-50/30 dark:bg-red-950/10"
                : "";

            return (
              <li
                key={row.id}
                className={cn(
                  "grid items-center gap-3 px-4 py-3",
                  "grid-cols-[auto_1fr_auto_auto_auto]",
                  rowBg
                )}
              >
                {/* # */}
                <span className="w-6 text-center text-xs tabular-nums text-muted-foreground/50">
                  {idx + 1}
                </span>

                {/* Name */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(row.student.firstName, row.student.lastName)}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/students/${row.student.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {name}
                    </Link>
                    {row.student.phone ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {row.student.phone}
                      </p>
                    ) : row.student.email ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {row.student.email}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Attendance */}
                <AttendanceToggle row={row} sessionId={sessionId} />

                {/* Payment */}
                <PaymentPopover
                  row={row}
                  sessionId={sessionId}
                  currency={currency}
                />

                {/* No-show */}
                <NoShowButton row={row} sessionId={sessionId} />
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        {groupLabel ?? format(roster.startDate, "EEEE, MMMM d, yyyy")} ·{" "}
        <Link
          href={`/courses/${roster.course.slug}?tab=sessions`}
          className="hover:underline"
        >
          ← Back to {roster.course.name}
        </Link>
      </p>
    </div>
  );
}
