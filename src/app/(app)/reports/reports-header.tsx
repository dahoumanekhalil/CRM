"use client";

import * as React from "react";
import { useQueryStates, parseAsString } from "nuqs";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

const filters = {
  from: parseAsString
    .withDefault("")
    .withOptions({ shallow: false, clearOnDefault: true }),
  to: parseAsString
    .withDefault("")
    .withOptions({ shallow: false, clearOnDefault: true }),
};

const iso = (d: Date) => format(d, "yyyy-MM-dd");

// Quick-range presets — one tap sets both dates.
const PRESETS: Array<{ label: string; compute: () => [string, string] }> = [
  {
    label: "Last 7 days",
    compute: () => [iso(subDays(new Date(), 6)), iso(new Date())],
  },
  {
    label: "Last 30 days",
    compute: () => [iso(subDays(new Date(), 29)), iso(new Date())],
  },
  {
    label: "Last 90 days",
    compute: () => [iso(subDays(new Date(), 89)), iso(new Date())],
  },
  {
    label: "This month",
    compute: () => [iso(startOfMonth(new Date())), iso(new Date())],
  },
  {
    label: "This year",
    compute: () => [iso(startOfYear(new Date())), iso(new Date())],
  },
];

export function ReportsHeader({
  defaultFrom,
  defaultTo,
}: {
  defaultFrom: string;
  defaultTo: string;
}) {
  const [values, setValues] = useQueryStates(filters);
  const currentFrom = values.from || defaultFrom;
  const currentTo = values.to || defaultTo;

  const [localFrom, setLocalFrom] = React.useState(currentFrom);
  const [localTo, setLocalTo] = React.useState(currentTo);

  // Keep local inputs in sync when the URL changes from a preset click.
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLocalFrom(currentFrom);
    setLocalTo(currentTo);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [currentFrom, currentTo]);

  const commit = (from: string, to: string) => {
    if (!from || !to) return;
    void setValues({ from, to });
  };

  const activePreset = PRESETS.find((p) => {
    const [f, t] = p.compute();
    return f === currentFrom && t === currentTo;
  });

  return (
    <div className="flex flex-col gap-3 border-b border-border/60 bg-card/40 px-6 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-sm">
        <CalendarRange className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">Range:</span>
        <input
          type="date"
          value={localFrom}
          onChange={(e) => setLocalFrom(e.target.value)}
          onBlur={() => commit(localFrom, localTo)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <span className="text-muted-foreground">→</span>
        <input
          type="date"
          value={localTo}
          onChange={(e) => setLocalTo(e.target.value)}
          onBlur={() => commit(localFrom, localTo)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => {
          const active = activePreset?.label === p.label;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                const [from, to] = p.compute();
                commit(from, to);
              }}
              className={cn(
                "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
