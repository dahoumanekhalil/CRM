import { Receipt } from "lucide-react";
import type { ExpensesReport } from "../actions";

function formatMoney(amount: number): string {
  return Math.round(amount).toLocaleString();
}

export function ExpensesSection({ data }: { data: ExpensesReport }) {
  const max = data.byCategory.reduce((m, c) => Math.max(m, c.total), 0);

  return (
    <section className="rounded-xl border border-border/60 bg-card">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Receipt className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Expenses</h2>
            <p className="text-xs text-muted-foreground">
              Non-cancelled · by category
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold tabular-nums">
            {formatMoney(data.total)}
          </span>
          <span className="text-xs text-muted-foreground">
            {data.count} record{data.count !== 1 ? "s" : ""}
          </span>
        </div>
      </header>
      {data.byCategory.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
          No expenses in this range.
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {data.byCategory.map((c) => {
            const share = max > 0 ? c.total / max : 0;
            return (
              <div key={c.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatMoney(c.total)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary/70"
                    style={{ width: `${share * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
