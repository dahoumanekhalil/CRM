"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  source: string;
  count: number;
}

const BAR_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function LeadSourcesBarChart({
  data,
  height,
}: {
  data: Point[];
  height?: number;
}) {
  // Row height ~28px, plus chart chrome — beats trying to squeeze N rows into a fixed 200px.
  const computed = height ?? Math.max(160, data.length * 34 + 24);

  return (
    <div style={{ width: "100%", height: computed }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            strokeOpacity={0.5}
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="source"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
            content={<ChartTooltip />}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            barSize={16}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
}) {
  if (!active || !payload?.length) return null;
  const { source, count } = payload[0].payload;
  return (
    <div className="rounded-md border border-border/70 bg-popover px-2.5 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{source}</div>
      <div className="text-muted-foreground">
        {count} {count === 1 ? "lead" : "leads"}
      </div>
    </div>
  );
}
