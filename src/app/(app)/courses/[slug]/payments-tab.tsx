import Link from "next/link";
import { format } from "date-fns";
import { Lock, Wallet } from "lucide-react";

import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import { getPaymentsForCourse } from "@/app/(app)/payments/actions";
import { requirePermissionPage } from "@/lib/auth-guards";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export async function PaymentsTab({ courseId }: { courseId: string }) {
  const { allowed } = await requirePermissionPage("payments.view");
  if (!allowed) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-8 text-center">
        <Lock className="mx-auto mb-2 size-5 text-muted-foreground" />
        <p className="text-sm font-medium">Payments are Finance-scoped</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Only Admin, Manager and Finance roles can view payment history for
          this course.
        </p>
      </div>
    );
  }

  const rows = await getPaymentsForCourse(courseId);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No payments for this course yet"
        description="Payments linked to any session of this course appear here. Record one from a student's Payments tab."
      />
    );
  }

  // Course-level totals per currency.
  const completedByCurrency = rows
    .filter((r) => r.status === "COMPLETED")
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.currency] = (acc[r.currency] ?? 0) + r.amount;
      return acc;
    }, {});

  return (
    <div className="space-y-4">
      <section
        aria-label="Totals"
        className="grid grid-cols-2 divide-x divide-border/60 rounded-xl border border-border/60 bg-card sm:grid-cols-3"
      >
        <div className="flex flex-col gap-1 px-5 py-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Payments
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {rows.length}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-5 py-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Completed
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {rows.filter((r) => r.status === "COMPLETED").length}
          </span>
        </div>
        <div className="col-span-2 flex flex-col gap-1 px-5 py-4 sm:col-span-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total collected
          </span>
          {Object.keys(completedByCurrency).length === 0 ? (
            <span className="text-2xl font-semibold tabular-nums text-muted-foreground">
              —
            </span>
          ) : (
            <span className="text-2xl font-semibold tabular-nums">
              {Object.entries(completedByCurrency)
                .map(([cur, amt]) => formatMoney(amt, cur))
                .join(" · ")}
            </span>
          )}
        </div>
      </section>

      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
        {rows.map((p) => {
          const studentName =
            [p.student.firstName, p.student.lastName]
              .filter(Boolean)
              .join(" ") ||
            p.student.email ||
            "Unnamed student";
          return (
            <li
              key={p.id}
              className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
                  <Wallet className="size-4" />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tabular-nums text-sm font-semibold">
                      {formatMoney(p.amount, p.currency)}
                    </span>
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-muted-foreground">
                      {humanize(p.method)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <Link
                      href={`/students/${p.student.id}`}
                      className="truncate hover:text-foreground"
                    >
                      {studentName}
                    </Link>
                    {p.registration?.session ? (
                      <>
                        <span aria-hidden className="opacity-40">
                          ·
                        </span>
                        <span className="truncate">
                          {format(
                            p.registration.session.startDate,
                            "MMM d, yyyy"
                          )}
                          {p.registration.session.title
                            ? ` — ${p.registration.session.title}`
                            : ""}
                        </span>
                      </>
                    ) : null}
                    {p.reference ? (
                      <>
                        <span aria-hidden className="opacity-40">
                          ·
                        </span>
                        <span className="truncate font-mono">
                          {p.reference}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="text-end text-xs tabular-nums text-muted-foreground">
                {p.paidAt ? format(p.paidAt, "MMM d, yyyy") : "unpaid"}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
