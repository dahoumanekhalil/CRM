import { ArrowRight, Filter } from "lucide-react";
import type { PipelineReport } from "../actions";

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

function pct(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export function PipelineSection({ data }: { data: PipelineReport }) {
  const stages = [
    { label: "Leads captured", value: data.leads, of: data.leads },
    { label: "Converted", value: data.converted, of: data.leads },
    { label: "Registered", value: data.registered, of: data.leads },
    { label: "Attended", value: data.attendedSessions, of: data.leads },
  ];

  return (
    <section className="rounded-xl border border-border/60 bg-card">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Filter className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Conversion funnel
          </h2>
          <p className="text-xs text-muted-foreground">
            Lead → student → registration → attendance for the range
          </p>
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-4">
        {stages.map((s, i) => {
          const isLast = i === stages.length - 1;
          const share = s.of === 0 ? 0 : Math.min(1, s.value / s.of);
          return (
            <div
              key={s.label}
              className="relative border-b border-border/60 px-4 py-4 sm:border-b-0 sm:border-e"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">
                  {s.value}
                </span>
                {i > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {pct(s.value, s.of)} of leads
                  </span>
                ) : null}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${share * 100}%` }}
                />
              </div>
              {!isLast ? (
                <ArrowRight
                  aria-hidden
                  className="absolute -end-3 top-1/2 hidden -translate-y-1/2 text-border sm:block"
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <footer className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-3 text-xs">
        <span className="text-muted-foreground">
          Revenue from this range (top currency)
        </span>
        <span className="font-medium tabular-nums">
          {data.revenueTopAmount > 0
            ? formatMoney(data.revenueTopAmount, data.revenueTopCurrency)
            : "—"}
        </span>
      </footer>
    </section>
  );
}
