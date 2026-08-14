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
  date: string; // yyyy-MM-dd
  leads: number;
}

export function LeadsOverTimeChart({
  data,
  height = 220,
}: {
  data: Point[];
  height?: number;
}) {
  const max = React.useMemo(
    () => data.reduce((m, p) => Math.max(m, p.leads), 0),
    [data]
  );

  // Show only a few tick labels — one every ~5 days looks tidy on a 30-day chart.
  const tickInterval = Math.max(0, Math.floor(data.length / 6) - 1);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-1)"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="var(--chart-1)"
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
            domain={[0, Math.max(4, max)]}
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
            content={<ChartTooltip />}
          />
          <Area
            type="monotone"
            dataKey="leads"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#leadsFill)"
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
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
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
          style={{ backgroundColor: "var(--chart-1)" }}
        />
        <span>
          {payload[0].value} {payload[0].value === 1 ? "lead" : "leads"}
        </span>
      </div>
    </div>
  );
}
