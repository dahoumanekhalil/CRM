import Link from "next/link";
import { format } from "date-fns";
import { Lock, Wallet } from "lucide-react";

import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import { requirePermissionPage } from "@/lib/auth-guards";
import { getPaymentsForSession } from "@/app/(app)/payments/actions";

const humanize = (s: string) =>
  s.toLowerCase().split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

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

export async function SessionPaymentsTab({
  sessionId,
  currency,
}: {
  sessionId: string;
  currency: string;
}) {
  const { allowed } = await requirePermissionPage("payments.view");
  if (!allowed) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-8 text-center">
        <Lock className="mx-auto mb-2 size-5 text-muted-foreground" />
        <p className="text-sm font-medium">Payments are Finance-scoped</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Only Admin, Manager and Finance roles can view payment records.
        </p>
      </div>
    );
  }

  const rows = await getPaymentsForSession(sessionId);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No payments recorded yet"
        description="Payments appear here once you record them from the Students tab."
      />
    );
  }

  const completed = rows.filter((r) => r.status === "COMPLETED" && r.amount > 0);
  const totalCollected = completed.reduce((s, r) => s + r.amount, 0);
  const totalRefunded = rows
    .filter((r) => r.status === "COMPLETED" && r.amount < 0)
    .reduce((s, r) => s + Math.abs(r.amount), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <section className="grid grid-cols-3 divide-x divide-border/60 rounded-xl border border-border/60 bg-card">
        <div className="flex flex-col gap-1 px-5 py-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Payments
          </span>
          <span className="text-2xl font-semibold tabular-nums">{completed.length}</span>
        </div>
        <div className="flex flex-col gap-1 px-5 py-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Collected
          </span>
          <span className="text-2xl font-semibold tabular-nums text-green-600 dark:text-green-400">
            {totalCollected > 0 ? formatMoney(totalCollected, currency) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-5 py-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Refunded
          </span>
          <span className="text-2xl font-semibold tabular-nums text-destructive">
            {totalRefunded > 0 ? formatMoney(totalRefunded, currency) : "—"}
          </span>
        </div>
      </section>

      {/* List */}
      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
        {rows.map((p) => {
          const name =
            [p.student.firstName, p.student.lastName].filter(Boolean).join(" ") ||
            p.student.email ||
            "Unnamed student";
          const isRefund = p.amount < 0;

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
                    <span
                      className={`tabular-nums text-sm font-semibold ${
                        isRefund ? "text-destructive" : ""
                      }`}
                    >
                      {isRefund ? "−" : ""}
                      {formatMoney(Math.abs(p.amount), p.currency)}
                    </span>
                    <StatusBadge status={isRefund ? "REFUND" : p.status} />
                    <span className="text-xs text-muted-foreground">
                      {humanize(p.method)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <Link
                      href={`/students/${p.student.id}`}
                      className="truncate hover:text-foreground hover:underline"
                    >
                      {name}
                    </Link>
                    {p.registration?.agreedPrice != null && (
                      <>
                        <span aria-hidden className="opacity-40">·</span>
                        <span>
                          agreed {formatMoney(p.registration.agreedPrice, p.currency)}
                        </span>
                      </>
                    )}
                    {p.notes && (
                      <>
                        <span aria-hidden className="opacity-40">·</span>
                        <span className="italic">{p.notes}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-end text-xs tabular-nums text-muted-foreground">
                {p.paidAt ? format(p.paidAt, "MMM d, yyyy") : "pending"}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
