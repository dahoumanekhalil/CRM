"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

interface Point {
  date: string;
  revenue: number;
}

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

export function RevenueOverTimeChart({
  data,
  currency,
  height = 220,
}: {
  data: Point[];
  currency: string;
  height?: number;
}) {
  const max = React.useMemo(
    () => data.reduce((m, p) => Math.max(m, p.revenue), 0),
    [data]
  );
  const tickInterval = Math.max(0, Math.floor(data.length / 6) - 1);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
        >
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-3)"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="var(--chart-3)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            interval={tickInterval}
            tickFormatter={(v: string) => format(parseISO(v), "MMM d")}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, Math.max(100, max)]}
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={50}
            tickFormatter={(v: number) =>
              v === 0 ? "0" : formatMoney(v, currency)
            }
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
            content={<ChartTooltip currency={currency} />}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--chart-3)"
            strokeWidth={2}
            fill="url(#revenueFill)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-md border border-border/70 bg-popover px-2.5 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium text-foreground">
        {format(parseISO(label), "MMM d, yyyy")}
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: "var(--chart-3)" }}
        />
        <span className="tabular-nums">
          {formatMoney(payload[0].value, currency)}
        </span>
      </div>
    </div>
  );
}
