"use client";

import * as React from "react";
import Link from "next/link";
import { parseISO, formatDistanceToNow, isPast, isToday } from "date-fns";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Sparkles,
  Star,
  UserCheck,
  X,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskSheet } from "@/app/(app)/tasks/task-sheet";
import { CommunicationSheet } from "@/components/shared/communication-sheet";
import { SessionSelectorDialog } from "@/app/(app)/leads/[id]/session-selector";
import { listUsersForPicker } from "@/app/(app)/tasks/actions";
import { toast } from "sonner";
import {
  getLeadDrawerData,
  updateLeadStatusDirect,
  updateLeadCourse,
  createRegistrationFromLead,
  listCoursesForLeadFilter,
  type LeadDrawerData,
  type LeadCoursePickerItem,
  type DrawerPaymentSummary,
} from "@/app/(app)/leads/actions";
import { createPaymentForRegistration } from "@/app/(app)/payments/actions";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_REFERENCE_LABEL,
  type PaymentMethod,
} from "@/lib/schemas/payment";
import type { LeadRow } from "@/app/(app)/leads/actions";
import type { UserPickerItem } from "@/app/(app)/tasks/actions";
import type { ActivityRow } from "@/lib/activity";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

const LEAD_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "REGISTERED", label: "Registered" },
  { value: "NOT_INTERESTED", label: "Not interested" },
  { value: "UNREACHABLE", label: "Unreachable" },
  { value: "LOST", label: "Lost" },
] as const;

function describeActivity(type: string, meta: unknown): string {
  const m = meta as Record<string, unknown> | null | undefined;
  switch (type) {
    case "lead.created":
    case "record.created":
      return "Lead captured";
    case "lead.updated":
    case "record.updated":
      return "Details updated";
    case "lead.status_changed": {
      const from = m?.from as string | undefined;
      const to = m?.to as string | undefined;
      const labels: Record<string, string> = {
        NEW: "New", ASSIGNED: "Assigned", CONTACTED: "Contacted",
        INTERESTED: "Interested", CONFIRMED: "Confirmed", REGISTERED: "Registered",
        LOST: "Lost", NOT_INTERESTED: "Not interested", UNREACHABLE: "Unreachable",
      };
      if (from && to) return `${labels[from] ?? from} → ${labels[to] ?? to}`;
      return "Status changed";
    }
    case "lead.assigned":
    case "lead.owner_changed":
      return "Owner changed";
    case "lead.converted":
      return "Converted to student";
    case "lead.next_action_set":
      return "Next action scheduled";
    case "lead.next_action_completed":
      return "Next action completed";
    case "communication.logged": {
      const ct = m?.communicationType as string | undefined;
      const typeMap: Record<string, string> = {
        CALL: "Call logged", EMAIL: "Email logged", SMS: "SMS logged",
        WHATSAPP: "WhatsApp message", MEETING: "Meeting logged", NOTE: "Note added",
      };
      return typeMap[ct ?? ""] ?? "Message logged";
    }
    case "task.created": {
      const title = m?.taskTitle as string | undefined;
      return title ? `Task: "${title}"` : "Task created";
    }
    case "task.completed":
      return "Task completed";
    case "registration.created":
      return "Registration created";
    default:
      return type.replace(".", " ");
  }
}

function ActivityIcon({ type }: { type: string }) {
  const Icon =
    type === "lead.created" || type === "record.created" ? Sparkles
    : type === "lead.status_changed" ? RefreshCw
    : type === "lead.assigned" || type === "lead.converted" ? UserCheck
    : type === "communication.logged" ? MessageSquare
    : type === "task.created" || type === "task.completed" ? ClipboardList
    : FileText;
  return <Icon className="size-3" />;
}

function CompactActivityList({ events }: { events: ActivityRow[] }) {
  if (events.length === 0) {
    return <p className="py-2 text-xs text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="space-y-2">
      {events.map((event) => {
        const actor = event.user ? (event.user.name ?? event.user.email) : "System";
        return (
          <li key={event.id} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <ActivityIcon type={event.type} />
            </span>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-foreground/90">
                {describeActivity(event.type, event.meta)}
              </span>
              <span className="text-muted-foreground">
                {" "}· {actor} · {formatDistanceToNow(event.createdAt, { addSuffix: true })}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const PAYMENT_STATUS_CONFIG = {
  UNPAID: {
    label: "Unpaid",
    className:
      "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
  PARTIALLY_PAID: {
    label: "Partially paid",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  FULLY_PAID: {
    label: "Fully paid",
    className:
      "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  },
} as const;

function PaymentStatusBadge({
  status,
}: {
  status: "UNPAID" | "PARTIALLY_PAID" | "FULLY_PAID";
}) {
  const { label, className } = PAYMENT_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        className
      )}
    >
      {label}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString("fr-DZ");
}

function InlinePaymentForm({
  registrationId,
  summary,
  onSuccess,
  onCancel,
}: {
  registrationId: string;
  summary: DrawerPaymentSummary;
  onSuccess: (updated: DrawerPaymentSummary) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = React.useState(
    summary.remaining > 0 ? summary.remaining.toString() : ""
  );
  const [method, setMethod] = React.useState<PaymentMethod>("CASH");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const isOverpayment =
    summary.remaining > 0 && parsedAmount > summary.remaining;
  const needsReference = method in PAYMENT_METHOD_REFERENCE_LABEL;

  async function handleSubmit() {
    setError(null);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (needsReference && reference.trim() === "") {
      setError(`${PAYMENT_METHOD_REFERENCE_LABEL[method]} is required.`);
      return;
    }
    setSaving(true);
    const res = await createPaymentForRegistration(registrationId, {
      amount: parsedAmount,
      method,
      reference,
      notes,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSuccess({
      agreedPrice: res.data.agreedPrice,
      totalPaid: res.data.totalPaid,
      remaining: res.data.remaining,
      paymentStatus: res.data.paymentStatus,
    });
    toast.success("Payment recorded");
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Record payment</p>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Amount (DZD)</label>
        <input
          type="number"
          min="0.01"
          step="500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded border border-border/60 bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
      </div>

      {/* Method */}
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Payment method</label>
        <Select
          value={method}
          onValueChange={(v) => { setMethod(v as PaymentMethod); setReference(""); }}
        >
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m} className="text-xs">
                {PAYMENT_METHOD_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reference — conditional */}
      {needsReference ? (
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">
            {PAYMENT_METHOD_REFERENCE_LABEL[method]}
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Enter reference…"
            className="w-full rounded border border-border/60 bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
          />
        </div>
      ) : null}

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes…"
          className="w-full rounded border border-border/60 bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
      </div>

      {/* Overpayment warning */}
      {isOverpayment ? (
        <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-2">
          <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Overpayment of{" "}
            <strong>{fmt(parsedAmount - summary.remaining)} DA</strong>. Total
            paid would be <strong>{fmt(summary.totalPaid + parsedAmount)} DA</strong> vs
            agreed <strong>{fmt(summary.agreedPrice)} DA</strong>.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className={cn(
            "flex-1 h-7 text-xs",
            isOverpayment && "bg-amber-600 hover:bg-amber-700 text-white"
          )}
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving
            ? "Recording…"
            : isOverpayment
              ? "Record overpayment"
              : "Record payment"}
        </Button>
      </div>
    </div>
  );
}

interface LeadDetailsDrawerProps {
  lead: LeadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailsDrawer({
  lead,
  open,
  onOpenChange,
}: LeadDetailsDrawerProps) {
  const [users, setUsers] = React.useState<UserPickerItem[]>([]);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [commOpen, setCommOpen] = React.useState(false);
  const [commType, setCommType] = React.useState<"CALL" | "NOTE">("CALL");
  const [drawerData, setDrawerData] = React.useState<LeadDrawerData | null>(null);
  const [loadingData, setLoadingData] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState<string | null>(null);
  const [savingStatus, setSavingStatus] = React.useState(false);
  const [activityExpanded, setActivityExpanded] = React.useState(false);
  const [courses, setCourses] = React.useState<LeadCoursePickerItem[]>([]);
  const [courseSearch, setCourseSearch] = React.useState("");
  const [showCourseSearch, setShowCourseSearch] = React.useState(false);
  const [savingCourse, setSavingCourse] = React.useState(false);
  const [agreedPrice, setAgreedPrice] = React.useState("");
  const [savingRegistration, setSavingRegistration] = React.useState(false);
  const [registrationError, setRegistrationError] = React.useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = React.useState(false);
  const [localPaymentSummary, setLocalPaymentSummary] = React.useState<DrawerPaymentSummary | null>(null);

  React.useEffect(() => {
    if (!lead) return;
    setCurrentStatus(lead.status);

    listUsersForPicker().then(setUsers).catch(() => {});

    if (open) {
      setLoadingData(true);
      setDrawerData(null);
      setActivityExpanded(false);
      setShowCourseSearch(false);
      setCourseSearch("");
      setShowPaymentForm(false);
      setLocalPaymentSummary(null);
      getLeadDrawerData(lead.id)
        .then(setDrawerData)
        .catch(() => {})
        .finally(() => setLoadingData(false));
      listCoursesForLeadFilter().then(setCourses).catch(() => {});
    }
  }, [lead?.id, open]);

  async function handleStatusChange(newStatus: string) {
    if (!lead || savingStatus) return;
    const prevStatus = currentStatus;
    setCurrentStatus(newStatus);
    setSavingStatus(true);
    try {
      const res = await updateLeadStatusDirect(lead.id, newStatus);
      if (!res.ok) setCurrentStatus(prevStatus);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleCourseSelect(courseId: string) {
    if (!lead || savingCourse) return;
    setSavingCourse(true);
    setShowCourseSearch(false);
    setCourseSearch("");
    try {
      await updateLeadCourse(lead.id, courseId);
    } finally {
      setSavingCourse(false);
    }
  }

  async function handleRegister() {
    if (!lead || !drawerData?.interestedSessionId || savingRegistration) return;
    setSavingRegistration(true);
    setRegistrationError(null);
    const price = agreedPrice.trim() !== "" ? parseFloat(agreedPrice) : null;
    const res = await createRegistrationFromLead(lead.id, drawerData.interestedSessionId, price);
    setSavingRegistration(false);
    if (!res.ok) {
      setRegistrationError(res.error);
      return;
    }
    toast.success("Registration confirmed");
    setCurrentStatus("REGISTERED");
  }

  const name = lead
    ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed lead"
    : "";

  const due = lead?.nextActionDue
    ? parseISO(lead.nextActionDue.toString())
    : null;
  const isOverdue = due && isPast(due) && !isToday(due);
  const isDueToday = due && isToday(due);

  const visibleActivity = activityExpanded
    ? (drawerData?.recentActivity ?? [])
    : (drawerData?.recentActivity ?? []).slice(0, 3);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="px-6 pb-4 pt-6">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {initials(name || "?")}
                  </AvatarFallback>
                </Avatar>
                {lead?.isHighPriority ? (
                  <Star className="absolute -end-1 -top-1 size-3.5 fill-amber-400 text-amber-400" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate text-base leading-snug">
                  {name}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Quick view of lead {name}
                </SheetDescription>
              </div>
            </div>

            {/* Inline status change */}
            {lead ? (
              <div className="mt-3">
                <Select
                  value={currentStatus ?? lead.status}
                  onValueChange={handleStatusChange}
                  disabled={savingStatus}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </SheetHeader>

          <Separator />

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            {/* Contact */}
            <MetaSection label="Contact">
              {lead?.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-sm text-foreground hover:underline"
                >
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{lead.email}</span>
                </a>
              ) : null}
              {lead?.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 text-sm text-foreground hover:underline"
                >
                  <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                  {lead.phone}
                </a>
              ) : null}
              {!lead?.email && !lead?.phone ? (
                <p className="text-sm text-muted-foreground">No contact info</p>
              ) : null}
            </MetaSection>

            {/* Course & Session selection */}
            <MetaSection label="Course interest">
              {lead?.course ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/courses/${lead.course.slug}`}
                      onClick={() => onOpenChange(false)}
                      className="flex min-w-0 items-center gap-2 text-sm text-foreground hover:underline"
                    >
                      <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{lead.course.name}</span>
                    </Link>
                    <button
                      type="button"
                      disabled={savingCourse}
                      onClick={() => setShowCourseSearch((v) => !v)}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Change
                    </button>
                  </div>
                  {/* Session selector for this course */}
                  {lead ? (
                    <SessionSelectorDialog
                      leadId={lead.id}
                      currentSessionId={drawerData?.interestedSessionId ?? null}
                      trigger={
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <CalendarDays className="size-3" />
                          {drawerData?.interestedSessionId
                            ? "Change course run"
                            : "Select course run"}
                        </button>
                      }
                    />
                  ) : null}

                  {/* Registration panel — shown when a course run is selected and lead not yet registered */}
                  {drawerData?.interestedSessionId && (currentStatus ?? lead?.status) !== "REGISTERED" ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                      <p className="text-xs font-medium text-foreground">Confirm registration</p>
                      <div className="flex items-center gap-2">
                        <label className="shrink-0 text-xs text-muted-foreground">Price (DZD)</label>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={agreedPrice}
                          onChange={(e) => setAgreedPrice(e.target.value)}
                          placeholder="Optional"
                          className="w-full rounded border border-border/60 bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                        />
                      </div>
                      {registrationError ? (
                        <p className="text-xs text-destructive">{registrationError}</p>
                      ) : null}
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs"
                        disabled={savingRegistration}
                        onClick={handleRegister}
                      >
                        {savingRegistration ? "Registering…" : "Confirm registration"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={savingCourse}
                  onClick={() => setShowCourseSearch(true)}
                  className="text-xs text-primary hover:underline"
                >
                  + Select course
                </button>
              )}

              {/* Inline course search */}
              {showCourseSearch ? (
                <div className="mt-2 rounded-lg border border-border/60 bg-card p-2">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-2 mb-2">
                    <input
                      autoFocus
                      placeholder="Search courses…"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => { setShowCourseSearch(false); setCourseSearch(""); }}
                    >
                      <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {courses
                      .filter((c) =>
                        c.name.toLowerCase().includes(courseSearch.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleCourseSelect(c.id)}
                          className="w-full rounded px-2 py-1.5 text-start text-xs hover:bg-muted"
                        >
                          {c.name}
                        </button>
                      ))}
                    {courses.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">No courses found.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </MetaSection>

            {/* Payment — shown once the lead has a registration */}
            {(drawerData?.registrationId) ? (
              <MetaSection label="Payment">
                {loadingData ? (
                  <div className="space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-16 w-full animate-pulse rounded bg-muted" />
                  </div>
                ) : (() => {
                  const summary = localPaymentSummary ?? drawerData.paymentSummary;
                  return (
                    <div className="space-y-2">
                      {summary ? (
                        <PaymentStatusBadge status={summary.paymentStatus} />
                      ) : null}

                      {summary ? (
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Agreed</span>
                            <span className="font-medium tabular-nums">{fmt(summary.agreedPrice)} DA</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Paid</span>
                            <span className="font-medium tabular-nums text-green-700 dark:text-green-400">
                              {fmt(summary.totalPaid)} DA
                            </span>
                          </div>
                          <Separator className="my-0.5" />
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">Remaining</span>
                            <span
                              className={cn(
                                "font-semibold tabular-nums",
                                summary.remaining > 0
                                  ? "text-destructive"
                                  : "text-green-700 dark:text-green-400"
                              )}
                            >
                              {fmt(summary.remaining)} DA
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {(!summary || summary.paymentStatus !== "FULLY_PAID") ? (
                        showPaymentForm ? (
                          <InlinePaymentForm
                            registrationId={drawerData.registrationId!}
                            summary={summary ?? { agreedPrice: 0, totalPaid: 0, remaining: 0, paymentStatus: "UNPAID" }}
                            onSuccess={(updated) => {
                              setLocalPaymentSummary(updated);
                              setShowPaymentForm(false);
                            }}
                            onCancel={() => setShowPaymentForm(false)}
                          />
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={() => setShowPaymentForm(true)}
                          >
                            <CreditCard className="size-3.5" />
                            Record payment
                          </Button>
                        )
                      ) : null}
                    </div>
                  );
                })()}
              </MetaSection>
            ) : null}

            {/* Owner */}
            <MetaSection label="Owner">
              {lead?.owner ? (
                <div className="flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarImage src={lead.owner.image ?? undefined} />
                    <AvatarFallback className="bg-muted text-[10px]">
                      {initials(lead.owner.name ?? lead.owner.email ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">
                    {lead.owner.name ?? lead.owner.email}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              )}
            </MetaSection>

            {/* Next action */}
            {lead?.nextAction ? (
              <MetaSection label="Next action">
                <div
                  className={cn(
                    "flex items-start gap-2 text-sm",
                    isOverdue
                      ? "text-destructive"
                      : isDueToday
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-foreground"
                  )}
                >
                  <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate">{lead.nextAction}</p>
                    {due ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Due {formatDistanceToNow(due, { addSuffix: true })}
                      </p>
                    ) : null}
                  </div>
                </div>
              </MetaSection>
            ) : null}

            {/* Last contact */}
            <MetaSection label="Last contact">
              <p className="text-sm text-muted-foreground">
                {lead?.lastContactedAt
                  ? formatDistanceToNow(lead.lastContactedAt, { addSuffix: true })
                  : "Never contacted"}
              </p>
            </MetaSection>

            {/* Notes preview */}
            <MetaSection label="Notes">
              {loadingData ? (
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              ) : drawerData?.notes ? (
                <div className="space-y-1">
                  <p className="text-sm text-foreground/80 line-clamp-3 whitespace-pre-wrap">
                    {drawerData.notes.replace(/<[^>]*>/g, " ").trim()}
                  </p>
                  <Link
                    href={lead ? `/leads/${lead.id}?tab=notes` : "#"}
                    onClick={() => onOpenChange(false)}
                    className="text-xs text-primary hover:underline"
                  >
                    Edit notes →
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                  <Link
                    href={lead ? `/leads/${lead.id}?tab=notes` : "#"}
                    onClick={() => onOpenChange(false)}
                    className="text-xs text-primary hover:underline"
                  >
                    Add notes →
                  </Link>
                </div>
              )}
            </MetaSection>

            {/* Activity */}
            <MetaSection label="Recent activity">
              {loadingData ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 w-full animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <CompactActivityList events={visibleActivity} />
                  {(drawerData?.recentActivity.length ?? 0) > 3 ? (
                    <button
                      type="button"
                      onClick={() => setActivityExpanded((v) => !v)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ChevronDown
                        className={cn(
                          "size-3 transition-transform",
                          activityExpanded && "rotate-180"
                        )}
                      />
                      {activityExpanded ? "Show less" : `Show ${(drawerData?.recentActivity.length ?? 0) - 3} more`}
                    </button>
                  ) : null}
                </div>
              )}
            </MetaSection>
          </div>

          <Separator />

          <div className="space-y-2 px-6 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { setCommType("CALL"); setCommOpen(true); }}
              >
                <Phone className="size-3.5" />
                Log call
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { setCommType("NOTE"); setCommOpen(true); }}
              >
                <FileText className="size-3.5" />
                Add note
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setTaskOpen(true)}
            >
              <ClipboardList className="size-3.5" />
              Create task
            </Button>
            <Button size="sm" className="w-full" asChild>
              <Link
                href={lead ? `/leads/${lead.id}` : "#"}
                onClick={() => onOpenChange(false)}
              >
                <ExternalLink className="size-3.5" />
                Open full profile
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {lead ? (
        <>
          <TaskSheet
            open={taskOpen}
            onOpenChange={setTaskOpen}
            users={users}
            defaultEntityType="Lead"
            defaultEntityId={lead.id}
            defaultEntityLabel={name}
          />
          <CommunicationSheet
            open={commOpen}
            onOpenChange={setCommOpen}
            leadId={lead.id}
            defaultType={commType}
          />
        </>
      ) : null}
    </>
  );
}

function MetaSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
