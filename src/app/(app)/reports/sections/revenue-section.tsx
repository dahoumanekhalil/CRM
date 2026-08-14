import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Wallet,
} from "lucide-react";
import { RevenueOverTimeChart } from "@/components/charts/revenue-over-time";
import { cn } from "@/lib/utils";
import type { RevenueReport } from "../actions";

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

function DeltaPill({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" />
      </span>
    );
  }
  if (Math.abs(pct) < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" /> 0%
      </span>
    );
  }
  const up = pct > 0;
  const abs = Math.abs(pct);
  const rounded = abs < 10 ? abs.toFixed(1) : Math.round(abs).toString();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-success" : "text-destructive"
      )}
    >
      {up ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {pct > 0 ? "+" : "-"}
      {rounded}%
    </span>
  );
}

export function RevenueSection({ data }: { data: RevenueReport }) {
  const hasData = data.perDay.some((p) => p.revenue > 0);

  return (
    <section className="rounded-xl border border-border/60 bg-card">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Revenue
            </h2>
            <p className="text-xs text-muted-foreground">
              Completed payments · {data.topCurrency}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold tabular-nums">
            {formatMoney(data.topAmount, data.topCurrency)}
          </span>
          <DeltaPill pct={data.topDelta} />
        </div>
      </header>
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_260px]">
        <div className="rounded-md border border-border/50 bg-background p-2">
          {hasData ? (
            <RevenueOverTimeChart
              data={data.perDay}
              currency={data.topCurrency}
              height={200}
            />
          ) : (
            <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
              No completed payments in this range.
            </div>
          )}
        </div>
        <aside className="space-y-3">
          <Fact label="Completed payments" value={String(data.completedCount)} />
          {data.otherCurrencies > 0 ? (
            <Fact
              label="Other currencies"
              value={`+${data.otherCurrencies}`}
              detail="See per-currency breakdown below"
            />
          ) : null}
          <div className="rounded-md border border-border/60 bg-muted/20 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Per-currency totals
            </div>
            <dl className="mt-2 space-y-1">
              {Object.entries(data.totalByCurrency).length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                Object.entries(data.totalByCurrency)
                  .sort((a, b) => b[1] - a[1])
                  .map(([currency, amount]) => (
                    <div
                      key={currency}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <dt className="text-muted-foreground">{currency}</dt>
                      <dd className="tabular-nums font-medium">
                        {formatMoney(amount, currency)}
                      </dd>
                    </div>
                  ))
              )}
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Fact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        {detail ? (
          <span className="text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </div>
    </div>
  );
}
