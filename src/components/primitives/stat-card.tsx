import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  // Percent change vs the comparison period. null = no comparison possible.
  deltaPct?: number | null;
  // Human-readable period this delta compares to (e.g. "vs previous 30 days").
  comparisonLabel?: string;
  // Optional secondary context line (e.g. "12 new this week").
  context?: string;
  href?: string;
  className?: string;
}

// KPI primitive per DESIGN.md §7 and §30. Handles null delta cleanly so
// empty-data days don't render broken arrows or lie with false trends.
export function StatCard({
  label,
  value,
  icon: Icon,
  deltaPct,
  comparisonLabel,
  context,
  href,
  className,
}: StatCardProps) {
  const inner = (
    <CardContent className="flex flex-col gap-3 px-5 py-1">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
        {Icon ? <Icon className="size-4" aria-hidden /> : null}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums leading-none">
          {value}
        </span>
        <Delta pct={deltaPct} />
      </div>
      {(comparisonLabel || context) && (
        <p className="text-xs text-muted-foreground">
          {context ?? comparisonLabel}
        </p>
      )}
    </CardContent>
  );

  const card = (
    <Card
      className={cn(
        "gap-0 py-5 transition-shadow",
        href && "hover:shadow-md",
        className
      )}
    >
      {inner}
    </Card>
  );

  if (!href) return card;
  // Non-anchor-in-anchor markup: the whole card is a link, the value stays a heading-y string.
  return (
    <a href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-xl">
      {card}
    </a>
  );
}

function Delta({ pct }: { pct: number | null | undefined }) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="size-3" />
      </span>
    );
  }
  if (Math.abs(pct) < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="size-3" /> 0%
      </span>
    );
  }
  const isUp = pct > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isUp ? "text-success" : "text-destructive"
      )}
    >
      {isUp ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {formatPct(pct)}
    </span>
  );
}

function formatPct(pct: number): string {
  const abs = Math.abs(pct);
  const rounded = abs < 10 ? abs.toFixed(1) : Math.round(abs).toString();
  return `${pct > 0 ? "+" : "-"}${rounded}%`;
}
