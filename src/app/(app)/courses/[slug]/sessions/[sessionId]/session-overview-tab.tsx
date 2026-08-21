import { TrendingDown, TrendingUp, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { auth } from "@/auth";
import { getCourseRunFinancials } from "./actions";
import type { SessionRoster } from "./actions";

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "amber" | "red";
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-semibold tabular-nums",
          accent === "green" && "text-green-600 dark:text-green-400",
          accent === "amber" && "text-amber-600 dark:text-amber-400",
          accent === "red" && "text-destructive"
        )}
      >
        {value}
      </span>
      {sub ? (
        <span className="text-xs text-muted-foreground">{sub}</span>
      ) : null}
    </div>
  );
}

export async function SessionOverviewTab({
  sessionId,
  roster,
}: {
  sessionId: string;
  roster: SessionRoster;
}) {
  const session = await auth();
  const canViewFinancials = hasPermission(session?.user?.role, "finance.view");

  const enrolled = roster.registrations.length;
  const capacity = roster.capacity ?? 0;
  const available = capacity > 0 ? Math.max(0, capacity - enrolled) : null;
  const fillPct = capacity > 0 ? Math.round((enrolled / capacity) * 100) : null;

  // Attendance summary from roster data
  const attendanceRecords = roster.registrations.flatMap((r) => r.attendance);
  const totalAttended = attendanceRecords.filter((a) => a.status === "PRESENT").length;
  const totalAbsent = attendanceRecords.filter((a) => a.status === "ABSENT").length;
  const totalLate = attendanceRecords.filter((a) => a.status === "LATE").length;
  const attendanceRate =
    attendanceRecords.length > 0
      ? Math.round((totalAttended / attendanceRecords.length) * 100)
      : null;

  // Financial data (Finance/Admin/Manager only)
  let financials: Awaited<ReturnType<typeof getCourseRunFinancials>> | null = null;
  if (canViewFinancials) {
    try {
      financials = await getCourseRunFinancials(sessionId);
    } catch {
      financials = null;
    }
  }

  return (
    <div className="space-y-4">
      {/* Enrollment metrics */}
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/60 bg-muted/30 px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Enrollment
          </h3>
        </div>
        <div className="grid divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <MetricCard
            label="Enrolled"
            value={enrolled}
            sub={capacity > 0 ? `of ${capacity} capacity` : "No capacity set"}
          />
          <MetricCard
            label="Available seats"
            value={available ?? "∞"}
            sub={fillPct !== null ? `${fillPct}% full` : undefined}
            accent={fillPct !== null && fillPct >= 90 ? "red" : fillPct !== null && fillPct >= 70 ? "amber" : undefined}
          />
          <div className="px-5 py-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Capacity bar
            </span>
            {capacity > 0 ? (
              <div className="mt-3 space-y-1.5">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      fillPct != null && fillPct >= 90
                        ? "bg-destructive"
                        : fillPct != null && fillPct >= 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(fillPct ?? 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {enrolled} / {capacity} seats filled
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No capacity limit</p>
            )}
          </div>
        </div>
      </section>

      {/* Attendance metrics */}
      {attendanceRecords.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="border-b border-border/60 bg-muted/30 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Attendance
            </h3>
          </div>
          <div className="grid divide-y divide-border/60 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <MetricCard label="Present" value={totalAttended} accent="green" />
            <MetricCard label="Absent" value={totalAbsent} accent={totalAbsent > 0 ? "red" : undefined} />
            <MetricCard label="Late" value={totalLate} accent={totalLate > 0 ? "amber" : undefined} />
            <MetricCard
              label="Attendance rate"
              value={attendanceRate !== null ? `${attendanceRate}%` : "—"}
              accent={
                attendanceRate !== null && attendanceRate >= 80
                  ? "green"
                  : attendanceRate !== null && attendanceRate >= 60
                  ? "amber"
                  : attendanceRate !== null
                  ? "red"
                  : undefined
              }
            />
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 px-5 py-4 text-sm text-muted-foreground">
          <Users className="size-4 shrink-0" />
          No attendance recorded yet. Mark attendance from the Students tab.
        </section>
      )}

      {/* Financial summary — Finance/Admin/Manager only */}
      {canViewFinancials && financials ? (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="border-b border-border/60 bg-muted/30 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Financials
            </h3>
          </div>
          <div className="grid divide-y divide-border/60 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <MetricCard
              label="Revenue (Agreed)"
              value={formatMoney(financials.agreedTotal, financials.currency)}
            />
            <MetricCard
              label="Collected"
              value={formatMoney(financials.collectedTotal, financials.currency)}
              accent="green"
            />
            <MetricCard
              label="Expenses"
              value={formatMoney(financials.expenseTotal, financials.currency)}
              accent={financials.expenseTotal > 0 ? "red" : undefined}
            />
            <div className="px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Gross Result
              </span>
              <div className="mt-1 flex items-center gap-2">
                {financials.grossResult >= 0 ? (
                  <TrendingUp className="size-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="size-4 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    financials.grossResult >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  )}
                >
                  {formatMoney(financials.grossResult, financials.currency)}
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
