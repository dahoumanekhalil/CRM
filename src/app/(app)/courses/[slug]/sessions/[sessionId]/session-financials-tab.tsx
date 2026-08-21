import { Lock, TrendingDown, TrendingUp } from "lucide-react";

import { requirePermissionPage } from "@/lib/auth-guards";
import { getCourseRunFinancials } from "./actions";
import { cn } from "@/lib/utils";

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

function StatRow({
  label,
  value,
  currency,
  sub,
  className,
}: {
  label: string;
  value: number;
  currency: string;
  sub?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2",
        sub ? "ps-4 text-sm text-muted-foreground" : "font-medium",
        className
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatMoney(value, currency)}</span>
    </div>
  );
}

export async function SessionFinancialsTab({ sessionId }: { sessionId: string }) {
  const { allowed } = await requirePermissionPage("finance.view");
  if (!allowed) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-8 text-center">
        <Lock className="mx-auto mb-2 size-5 text-muted-foreground" />
        <p className="text-sm font-medium">Financial data is Finance-scoped</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Only Admin, Manager and Finance roles can view the financial summary.
        </p>
      </div>
    );
  }

  const fin = await getCourseRunFinancials(sessionId);
  const { currency } = fin;
  const isProfit = fin.grossResult >= 0;

  return (
    <div className="space-y-4">
      {/* Revenue card */}
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/60 bg-muted/30 px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Revenue
          </h3>
        </div>
        <div className="divide-y divide-border/60 px-5">
          <StatRow label="Revenue (Agreed)" value={fin.agreedTotal} currency={currency} />
          <StatRow label="Collected" value={fin.collectedTotal} currency={currency} />
          <StatRow
            label="Outstanding"
            value={fin.outstanding}
            currency={currency}
            className={
              fin.outstanding > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            }
          />
        </div>
      </section>

      {/* Expenses card */}
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/60 bg-muted/30 px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Expenses
          </h3>
        </div>
        <div className="divide-y divide-border/60 px-5">
          {fin.expensesByCategory.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No expenses recorded for this course run.
            </p>
          ) : (
            <>
              {fin.expensesByCategory.map((e) => (
                <StatRow
                  key={e.category}
                  label={e.label}
                  value={e.total}
                  currency={currency}
                  sub
                />
              ))}
              <StatRow
                label="Total Expenses"
                value={fin.expenseTotal}
                currency={currency}
                className="text-destructive"
              />
            </>
          )}
        </div>
      </section>

      {/* Gross result */}
      <section
        className={cn(
          "flex items-center justify-between rounded-xl border px-5 py-4",
          isProfit
            ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20"
            : "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
        )}
      >
        <div className="flex items-center gap-2">
          {isProfit ? (
            <TrendingUp className="size-5 text-green-600 dark:text-green-400" />
          ) : (
            <TrendingDown className="size-5 text-destructive" />
          )}
          <span className="font-semibold">Gross Result</span>
          <span className="text-xs text-muted-foreground">(Collected − Expenses)</span>
        </div>
        <span
          className={cn(
            "text-xl font-bold tabular-nums",
            isProfit
              ? "text-green-600 dark:text-green-400"
              : "text-destructive"
          )}
        >
          {formatMoney(fin.grossResult, currency)}
        </span>
      </section>
    </div>
  );
}
