import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarDays,
  CalendarCheck2,
  ClipboardList,
  MapPin,
  Wallet,
} from "lucide-react";

import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getRegistrationsForStudent } from "@/app/(app)/registrations/actions";
import { getPaymentSummariesForStudent } from "@/app/(app)/payments/actions";
import { hasPermission } from "@/lib/permissions";
import { auth } from "@/auth";

function formatMoney(amount: number, currency = "DZD"): string {
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

export async function RegistrationsTab({ studentId }: { studentId: string }) {
  const session = await auth();
  const canViewPayments = hasPermission(session?.user?.role, "payments.view");

  const [rows, allAttendance, paymentSummaries] = await Promise.all([
    getRegistrationsForStudent(studentId),
    prisma.attendance.findMany({
      where: { registration: { studentId } },
      select: { registrationId: true, status: true },
    }),
    canViewPayments
      ? getPaymentSummariesForStudent(studentId)
      : Promise.resolve(
          {} as Awaited<ReturnType<typeof getPaymentSummariesForStudent>>
        ),
  ]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No registrations yet"
        description={`Use the "Register for course" button above to book this student into a session.`}
      />
    );
  }

  // Build attendance summary per registration
  const attMap = new Map<string, { total: number; attended: number }>();
  for (const a of allAttendance) {
    const entry = attMap.get(a.registrationId) ?? { total: 0, attended: 0 };
    entry.total++;
    if (a.status === "PRESENT" || a.status === "LATE") entry.attended++;
    attMap.set(a.registrationId, entry);
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
      {rows.map((r) => {
        const s = r.session;
        const dateLabel = format(s.startDate, "MMM d, yyyy");
        const timeLabel = `${format(s.startDate, "HH:mm")} – ${format(s.endDate, "HH:mm")}`;
        const where =
          [s.city, s.country].filter(Boolean).join(", ") || s.location || null;
        const att = attMap.get(r.id);
        const attPct =
          att && att.total > 0
            ? Math.round((att.attended / att.total) * 100)
            : null;

        const pmtSummary = canViewPayments ? paymentSummaries[r.id] : null;

        return (
          <li
            key={r.id}
            className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
                <CalendarDays className="size-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/courses/${s.course.slug}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {s.course.name}
                    {s.title ? (
                      <span className="text-muted-foreground"> · {s.title}</span>
                    ) : null}
                  </Link>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="tabular-nums">{dateLabel}</span>
                  <span aria-hidden className="opacity-40">·</span>
                  <span className="tabular-nums">{timeLabel}</span>
                  {where ? (
                    <>
                      <span aria-hidden className="opacity-40">·</span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="size-3" /> {where}
                      </span>
                    </>
                  ) : null}
                </div>
                {/* Attendance summary */}
                {att && att.total > 0 ? (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <CalendarCheck2 className="size-3 shrink-0 text-muted-foreground" />
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums",
                        attPct !== null && attPct >= 75
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {att.attended} / {att.total} sessions attended
                      {attPct !== null ? ` (${attPct}%)` : ""}
                    </span>
                  </div>
                ) : null}
                {/* Payment summary */}
                {pmtSummary && pmtSummary.agreedPrice > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Wallet className="size-3 shrink-0" />
                      <span className="tabular-nums font-medium">
                        {formatMoney(pmtSummary.totalPaid)}
                      </span>
                      {" / "}
                      <span className="tabular-nums">
                        {formatMoney(pmtSummary.agreedPrice)}
                      </span>
                    </span>
                    {pmtSummary.paymentStatus === "UNPAID" && (
                      <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                        Unpaid
                      </span>
                    )}
                    {pmtSummary.paymentStatus === "PARTIALLY_PAID" && (
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        {formatMoney(pmtSummary.remaining)} remaining
                      </span>
                    )}
                    {pmtSummary.paymentStatus === "FULLY_PAID" && (
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Paid in full
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="text-end text-xs tabular-nums text-muted-foreground">
              Registered {format(r.registeredAt, "MMM d, yyyy")}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
