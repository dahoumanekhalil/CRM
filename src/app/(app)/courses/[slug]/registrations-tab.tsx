import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, ClipboardList, GraduationCap, Wallet } from "lucide-react";

import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import { cn } from "@/lib/utils";
import { getRegistrationsForCourse } from "@/app/(app)/registrations/actions";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";

function formatMoney(n: number) {
  return `${n.toLocaleString("fr-DZ")} DA`;
}

function CapacityBar({ filled, capacity }: { filled: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min((filled / capacity) * 100, 100) : 0;
  const barColor =
    pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";
  const label =
    pct >= 90 ? "text-destructive" : pct >= 75 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          {filled} {filled === 1 ? "registration" : "registrations"}
        </span>
        {capacity > 0 ? (
          <span className={cn("font-medium tabular-nums", label)}>
            {Math.round(pct)}% capacity
          </span>
        ) : null}
      </div>
      {capacity > 0 ? (
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={filled}
          aria-valuemax={capacity}
          aria-label={`${filled} of ${capacity} seats filled`}
        >
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      {capacity > 0 ? (
        <p className="text-xs text-muted-foreground">
          {filled} / {capacity} seats filled
          {capacity - filled > 0 ? ` · ${capacity - filled} available` : " · Full"}
        </p>
      ) : null}
    </div>
  );
}

export async function RegistrationsTab({
  courseId,
  activeRegistrations,
  totalCapacity,
}: {
  courseId: string;
  activeRegistrations?: number;
  totalCapacity?: number;
}) {
  const session = await auth();
  const canViewPayments = hasPermission(session?.user?.role, "payments.view");
  const rows = await getRegistrationsForCourse(courseId);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No registrations yet"
        description="Registrations appear here once a student books a course run. Register someone from the Course Runs tab or directly from their profile."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Capacity bar */}
      {(activeRegistrations !== undefined && totalCapacity !== undefined && totalCapacity > 0) ? (
        <div className="rounded-xl border border-border/60 bg-card px-5 py-4">
          <CapacityBar filled={activeRegistrations} capacity={totalCapacity} />
        </div>
      ) : null}

    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <header className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">
          Registrations across all sessions
        </h2>
        <p className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "registration" : "registrations"} · newest first
        </p>
      </header>
      <ul className="divide-y divide-border/60">
        {rows.map((r) => {
          const studentName =
            [r.student.firstName, r.student.lastName]
              .filter(Boolean)
              .join(" ") ||
            r.student.email ||
            "Unnamed student";
          return (
            <li key={r.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  <GraduationCap className="size-4" />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/students/${r.student.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {studentName}
                    </Link>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 truncate">
                      <CalendarDays className="size-3" />
                      {format(r.session.startDate, "MMM d, yyyy")}
                    </span>
                    {r.session.title ? (
                      <>
                        <span aria-hidden className="opacity-40">
                          ·
                        </span>
                        <span className="truncate">{r.session.title}</span>
                      </>
                    ) : null}
                    {r.session.city ? (
                      <>
                        <span aria-hidden className="opacity-40">
                          ·
                        </span>
                        <span>{r.session.city}</span>
                      </>
                    ) : null}
                  </div>
                  {/* Payment summary — finance/sales/admin only */}
                  {canViewPayments && r.paymentSummary.agreedPrice > 0 ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Wallet className="size-3 shrink-0" />
                        <span className="tabular-nums font-medium">
                          {formatMoney(r.paymentSummary.totalPaid)}
                        </span>
                        {" / "}
                        <span className="tabular-nums">
                          {formatMoney(r.paymentSummary.agreedPrice)}
                        </span>
                      </span>
                      {r.paymentSummary.paymentStatus === "UNPAID" && (
                        <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                          Unpaid
                        </span>
                      )}
                      {r.paymentSummary.paymentStatus === "PARTIALLY_PAID" && (
                        <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          {formatMoney(r.paymentSummary.remaining)} remaining
                        </span>
                      )}
                      {r.paymentSummary.paymentStatus === "FULLY_PAID" && (
                        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Paid in full
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="text-end text-xs tabular-nums text-muted-foreground">
                {format(r.registeredAt, "MMM d, yyyy")}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
    </div>
  );
}
