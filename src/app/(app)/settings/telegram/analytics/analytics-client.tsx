"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { format, parseISO, differenceInHours, differenceInMinutes } from "date-fns";
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Send,
  RefreshCw,
  ShieldX,
  Activity,
  Link2Off,
  UserCheck,
  UserX,
  ShieldCheck,
  Loader2,
  Bell,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/primitives/stat-card";
import { StatusBadge } from "@/components/primitives/status-badge";
import { EmptyState } from "@/components/primitives/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AnalyticsSummary,
  VolumePoint,
  TypeBreakdownRow,
  EmployeeDeliveryRow,
  RetryStats,
  SystemHealth,
  MergedActivityEvent,
  DeliveryStats,
  FailureReasonRow,
  ConnectionStats,
} from "./actions";
import { getVolumeTimeSeries, getTypeBreakdown, getFailureStats } from "./actions";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  "task.reminder": "Task Reminder",
  "task.overdue": "Overdue Task",
  "task.assigned": "Task Assigned",
  "session.reminder": "Session Reminder",
  "session.nearCapacity": "Capacity Alert",
  "payment.pending": "Payment Pending",
  "lead.assigned": "Lead Assigned",
  "daily.digest": "Daily Digest",
  "course.update": "Course Update",
};

const STATUS_TONE = {
  CONNECTED: "success",
  PENDING: "warning",
  DISABLED: "neutral",
  REVOKED: "neutral",
  BLOCKED: "danger",
  ERROR: "danger",
} as const;

const CONN_STATUS_COLORS: Record<string, string> = {
  CONNECTED: "var(--chart-2)",
  PENDING: "var(--chart-4)",
  DISABLED: "var(--muted-foreground)",
  REVOKED: "var(--muted-foreground)",
  BLOCKED: "var(--destructive)",
  ERROR: "var(--destructive)",
};

const DATE_RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

// ── Layout helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-5">
      <div className="mb-4">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border/60">
      <p className="text-xs text-muted-foreground">No data yet</p>
    </div>
  );
}

// ── Shared tooltip ─────────────────────────────────────────────────────────────

function GenericTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  labelFormatter?: (l: string) => string;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-md border border-border/70 bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1.5 font-medium text-foreground">
        {labelFormatter ? labelFormatter(label) : label}
      </div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="ms-0.5 font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── TASK 15.3 — Volume bar chart ──────────────────────────────────────────────

function VolumeChart({ data }: { data: VolumePoint[] }) {
  const hasData = data.some((p) => p.sent > 0 || p.failed > 0);
  if (!hasData) return <ChartEmpty />;
  const tickInterval = Math.max(0, Math.floor(data.length / 6) - 1);
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="date"
            interval={tickInterval}
            tickFormatter={(v: string) => format(parseISO(v), "MMM d")}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<GenericTooltip labelFormatter={(v) => format(parseISO(v), "MMM d, yyyy")} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="sent" name="Sent" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="failed" name="Failed" fill="var(--destructive)" radius={[2, 2, 0, 0]} opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── TASK 15.5 — Type breakdown chart ─────────────────────────────────────────

function TypeBreakdownChart({ data }: { data: TypeBreakdownRow[] }) {
  if (!data.length) return <ChartEmpty />;
  const chartData = data.slice(0, 8).map((r) => ({
    name: TYPE_LABELS[r.type] ?? r.type,
    sent: r.sent,
    failed: r.failed,
  }));
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={108} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<GenericTooltip />} />
          <Bar dataKey="sent" name="Sent" fill="var(--chart-2)" radius={[0, 2, 2, 0]} />
          <Bar dataKey="failed" name="Failed" fill="var(--destructive)" radius={[0, 2, 2, 0]} opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── TASK 15.4 — Delivery performance stats ────────────────────────────────────

function DeliveryStatsSection({ stats }: { stats: DeliveryStats }) {
  const latencyLabel = stats.avgLatencyMs !== null
    ? stats.avgLatencyMs < 1000
      ? `${stats.avgLatencyMs}ms`
      : `${(stats.avgLatencyMs / 1000).toFixed(1)}s`
    : "—";

  const items = [
    { label: "Success rate", value: `${stats.successRate}%` },
    { label: "Failure rate", value: `${stats.failureRate}%` },
    { label: "Retry rate", value: `${stats.retryRate}%` },
    { label: "Avg latency (30d)", value: latencyLabel },
    { label: "Sent all time", value: stats.sentAllTime.toString() },
    { label: "Failed all time", value: stats.failedAllTime.toString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border/70 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── TASK 15.7 — Failure analytics ─────────────────────────────────────────────

function FailureStatsSection({ stats }: { stats: FailureReasonRow[] }) {
  if (!stats.length) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No failures"
        description="No failed notifications in this period."
        className="border-dashed"
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-muted/40">
            {["Failure reason", "Count"].map((h) => (
              <th key={h} className="h-10 px-4 text-start text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((row) => (
            <tr key={row.reason} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
              <td className="px-4 py-2.5 text-sm text-foreground/90">{row.reason}</td>
              <td className="px-4 py-2.5 tabular-nums text-sm font-medium text-destructive">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── TASK 15.8 — Retry stats ───────────────────────────────────────────────────

function RetryStatsRow({ stats }: { stats: RetryStats }) {
  const items = [
    { label: "Total retried", value: stats.totalRetried },
    { label: "Succeeded after retry", value: stats.succeededAfterRetry },
    { label: "Permanently failed", value: stats.permanentlyFailed },
    { label: "Avg attempts", value: stats.avgAttempts.toString() },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border/70 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── TASK 15.9 — Connection analytics (donut + trend) ─────────────────────────

function ConnectionDonut({ byStatus }: { byStatus: ConnectionStats["byStatus"] }) {
  if (!byStatus.length) return <ChartEmpty />;
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={byStatus}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
          >
            {byStatus.map((entry) => (
              <Cell
                key={entry.status}
                fill={CONN_STATUS_COLORS[entry.status] ?? "var(--muted-foreground)"}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              return (
                <div className="rounded-md border border-border/70 bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-foreground">{String(p.name)}</p>
                  <p className="text-muted-foreground">{String(p.value)} connections</p>
                </div>
              );
            }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ConnectionTrend({ byWeek }: { byWeek: ConnectionStats["byWeek"] }) {
  if (!byWeek.length) return <ChartEmpty />;
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={byWeek} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={(v: string) => format(parseISO(v), "MMM d")}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
          <Tooltip content={<GenericTooltip labelFormatter={(v) => `Week of ${format(parseISO(v), "MMM d, yyyy")}`} />} />
          <Line type="monotone" dataKey="count" name="New connections" stroke="var(--chart-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── TASK 15.10 — System health panel ─────────────────────────────────────────

function SystemHealthPanel({ health }: { health: SystemHealth }) {
  const now = new Date();
  const lastSent = health.lastSentAt ? parseISO(health.lastSentAt) : null;
  const hoursAgo = lastSent ? differenceInHours(now, lastSent) : null;
  const oldestPending = health.oldestPendingAt ? parseISO(health.oldestPendingAt) : null;
  const pendingMinutesOld = oldestPending ? differenceInMinutes(now, oldestPending) : null;

  const issues: string[] = [];
  if (hoursAgo !== null && hoursAgo > 24) issues.push("No deliveries in the last 24 hours");
  if (health.staleProcessingCount > 0)
    issues.push(`${health.staleProcessingCount} stale PROCESSING record${health.staleProcessingCount > 1 ? "s" : ""}`);
  if (pendingMinutesOld !== null && pendingMinutesOld > 10)
    issues.push("Oldest pending notification is overdue (>10 min)");

  const warnings: string[] = [];
  if (hoursAgo !== null && hoursAgo > 2 && hoursAgo <= 24)
    warnings.push(`No deliveries in ${hoursAgo}h — check cron schedule`);

  const statusType = issues.length > 0 ? "error" : warnings.length > 0 ? "warning" : "ok";
  const Icon = statusType === "ok" ? CheckCircle2 : statusType === "warning" ? AlertTriangle : XCircle;
  const iconColor = statusType === "ok" ? "text-emerald-500" : statusType === "warning" ? "text-amber-500" : "text-destructive";
  const label = statusType === "ok" ? "Healthy" : statusType === "warning" ? "Warning" : "Issue detected";

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${iconColor}`} />
        <div className="flex-1 space-y-1">
          <p className={`text-sm font-semibold ${iconColor}`}>{label}</p>
          {issues.map((i) => <p key={i} className="text-xs text-destructive">{i}</p>)}
          {warnings.map((w) => <p key={w} className="text-xs text-amber-600 dark:text-amber-400">{w}</p>)}
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-xs text-muted-foreground">
            <span>Last delivery: <span className="text-foreground">{lastSent ? format(lastSent, "MMM d, HH:mm") : "Never"}</span></span>
            {health.staleProcessingCount > 0 && (
              <span>Stale processing: <span className="text-destructive">{health.staleProcessingCount}</span></span>
            )}
            {oldestPending && (
              <span>Oldest pending: <span className="text-foreground">{format(oldestPending, "MMM d, HH:mm")}</span></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TASK 15.6 — Employee delivery table ───────────────────────────────────────

function EmployeeTable({ rows }: { rows: EmployeeDeliveryRow[] }) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || r.name?.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "NOT_CONNECTED" ? r.connStatus === null : r.connStatus === statusFilter);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-64 text-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="CONNECTED">Connected</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="DISABLED">Disabled</SelectItem>
            <SelectItem value="REVOKED">Revoked</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
            <SelectItem value="NOT_CONNECTED">Not connected</SelectItem>
          </SelectContent>
        </Select>
        <span className="ms-auto text-xs text-muted-foreground">{filtered.length} employees</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-muted/40">
              {["Employee", "Role", "Telegram", "Sent", "Failed", "Pending", "Last Sent"].map((h) => (
                <th key={h} className="h-10 px-4 text-start text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState icon={Bot} title="No employees found" description="Try adjusting your search or filter." className="rounded-none border-none" />
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.userId} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground/90">{row.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs capitalize text-muted-foreground">{row.role.toLowerCase()}</td>
                  <td className="px-4 py-2.5">
                    {row.connStatus ? (
                      <StatusBadge status={row.connStatus} tone={STATUS_TONE[row.connStatus as keyof typeof STATUS_TONE] ?? "neutral"} />
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-xs">
                    {row.sent > 0 ? <span className="font-medium text-emerald-600 dark:text-emerald-400">{row.sent}</span> : <span className="text-muted-foreground">0</span>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-xs">
                    {row.failed > 0 ? <span className="font-medium text-destructive">{row.failed}</span> : <span className="text-muted-foreground">0</span>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-xs text-muted-foreground">{row.pending}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {row.lastSentAt ? format(parseISO(row.lastSentAt), "MMM d, HH:mm") : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TASK 15.11 — Merged activity timeline ─────────────────────────────────────

function auditDescription(e: MergedActivityEvent): string {
  const actor = e.actorName ?? "Unknown";
  const target = e.targetName ?? "Unknown";
  const isSelf = e.actorName === e.targetName;
  switch (e.action) {
    case "connected": return `${actor} connected Telegram`;
    case "disconnected": return `${actor} disconnected Telegram`;
    case "revoked": return isSelf ? `${actor}'s connection was revoked` : `${actor} revoked ${target}'s connection${e.reason ? ` — ${e.reason}` : ""}`;
    case "admin_initiated": return `${actor} generated a link for ${target}`;
    case "manager_initiated": return `${actor} generated a link for ${target}`;
    case "re_linked": return `${actor} reconnected Telegram`;
    case "blocked": return `${target}'s account blocked the bot`;
    default: return e.action ?? "Unknown event";
  }
}

function notifDescription(e: MergedActivityEvent): string {
  const name = e.recipientName ?? "Unknown";
  const type = TYPE_LABELS[e.notifType ?? ""] ?? e.notifType ?? "Notification";
  if (e.status === "SENT") return `${type} sent to ${name}`;
  return `${type} failed for ${name}`;
}

function MergedTimeline({ events }: { events: MergedActivityEvent[] }) {
  if (!events.length) {
    return (
      <EmptyState icon={Activity} title="No activity yet" description="Connection and notification events will appear here." className="border-dashed" />
    );
  }

  return (
    <div className="divide-y divide-border/50 rounded-xl border border-border/70 bg-card">
      {events.map((e) => {
        const isAudit = e.kind === "audit";
        const isFailed = e.status === "FAILED";

        let Icon = Activity;
        if (isAudit) {
          if (e.action === "connected" || e.action === "re_linked") Icon = UserCheck;
          else if (e.action === "disconnected") Icon = Link2Off;
          else if (e.action === "revoked") Icon = ShieldX;
          else if (e.action === "admin_initiated" || e.action === "manager_initiated") Icon = ShieldCheck;
          else if (e.action === "blocked") Icon = UserX;
        } else {
          Icon = isFailed ? BellOff : Bell;
        }

        const iconColor = isFailed || e.action === "revoked" || e.action === "blocked"
          ? "text-destructive"
          : "text-muted-foreground";

        return (
          <div key={e.id} className="flex items-start gap-3 px-4 py-3">
            <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className={`size-3.5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/90">
                {isAudit ? auditDescription(e) : notifDescription(e)}
              </p>
              {!isAudit && isFailed && e.failureReason && (
                <p className="mt-0.5 text-xs text-muted-foreground">{e.failureReason.slice(0, 80)}</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {format(parseISO(e.createdAt), "MMM d, HH:mm")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── TASK 15.12 — Date range filter (controls charts + failure stats) ───────────

// ── Main analytics client ─────────────────────────────────────────────────────

export function AnalyticsClient({
  summary,
  health,
  employees,
  retryStats,
  deliveryStats,
  initialFailureStats,
  connectionStats,
  recentActivity,
  initialVolume,
  initialTypeBreakdown,
}: {
  summary: AnalyticsSummary;
  health: SystemHealth;
  employees: EmployeeDeliveryRow[];
  retryStats: RetryStats;
  deliveryStats: DeliveryStats;
  initialFailureStats: FailureReasonRow[];
  connectionStats: ConnectionStats;
  recentActivity: MergedActivityEvent[];
  initialVolume: VolumePoint[];
  initialTypeBreakdown: TypeBreakdownRow[];
}) {
  const [selectedDays, setSelectedDays] = React.useState(30);
  const [volume, setVolume] = React.useState(initialVolume);
  const [typeBreakdown, setTypeBreakdown] = React.useState(initialTypeBreakdown);
  const [failureStats, setFailureStats] = React.useState(initialFailureStats);
  const [loadingCharts, setLoadingCharts] = React.useState(false);

  async function handleDaysChange(days: number) {
    if (days === selectedDays) return;
    setSelectedDays(days);
    setLoadingCharts(true);
    try {
      const [v, t, f] = await Promise.all([
        getVolumeTimeSeries(days),
        getTypeBreakdown(days),
        getFailureStats(days),
      ]);
      setVolume(v);
      setTypeBreakdown(t);
      setFailureStats(f);
    } catch {
      toast.error("Failed to refresh chart data.");
    } finally {
      setLoadingCharts(false);
    }
  }

  const totalUsers =
    summary.connected + summary.notConnected + summary.pendingConn +
    summary.disabled + summary.blocked + summary.revoked;

  return (
    <div className="space-y-10">

      {/* ── 15.2 KPI Cards ───────────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Overview</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Connected" value={summary.connected.toString()} icon={Users} context={`of ${totalUsers} users`} />
          <StatCard label="Not connected" value={summary.notConnected.toString()} icon={Bot} />
          <StatCard label="Delivery rate" value={`${summary.deliveryRate}%`} icon={Send} context="Last 30 days" />
          <StatCard label="Sent (30d)" value={summary.sent30d.toString()} icon={CheckCircle2} />
          <StatCard label="Failed (30d)" value={summary.failed30d.toString()} icon={XCircle} context={summary.blocked > 0 ? `${summary.blocked} blocked` : undefined} />
        </div>
      </section>

      {/* ── 15.10 System Health ──────────────────────────────────────────────── */}
      <section>
        <SectionLabel>System health</SectionLabel>
        <SystemHealthPanel health={health} />
      </section>

      {/* ── 15.4 Delivery performance ────────────────────────────────────────── */}
      <section>
        <SectionLabel>Delivery performance</SectionLabel>
        <DeliveryStatsSection stats={deliveryStats} />
      </section>

      {/* ── 15.3 + 15.5 Charts with date range filter ────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>Delivery trends</SectionLabel>
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5">
            {DATE_RANGES.map(({ label, days }) => (
              <Button
                key={label}
                size="sm"
                variant={selectedDays === days ? "secondary" : "ghost"}
                className="h-6 px-2.5 text-xs"
                onClick={() => void handleDaysChange(days)}
                disabled={loadingCharts}
              >
                {label}
              </Button>
            ))}
            {loadingCharts && <Loader2 className="ms-1 size-3 animate-spin text-muted-foreground" />}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Notification volume" subtitle="Sent vs. failed per day">
            <VolumeChart data={volume} />
          </ChartCard>
          <ChartCard title="By notification type" subtitle="Sent vs. failed breakdown">
            <TypeBreakdownChart data={typeBreakdown} />
          </ChartCard>
        </div>
      </section>

      {/* ── 15.9 Connection analytics ────────────────────────────────────────── */}
      <section>
        <SectionLabel>Connection analytics</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Connection status" subtitle="Current distribution">
            <ConnectionDonut byStatus={connectionStats.byStatus} />
          </ChartCard>
          <ChartCard title="New connections" subtitle="Weekly trend (last 12 weeks)">
            <ConnectionTrend byWeek={connectionStats.byWeek} />
          </ChartCard>
        </div>
      </section>

      {/* ── 15.7 Failure analytics ───────────────────────────────────────────── */}
      <section>
        <SectionLabel>Failure breakdown</SectionLabel>
        <FailureStatsSection stats={failureStats} />
      </section>

      {/* ── 15.8 Retry stats ─────────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Retry statistics</SectionLabel>
        <RetryStatsRow stats={retryStats} />
      </section>

      {/* ── 15.6 Employee table ──────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Per-employee delivery</SectionLabel>
        <EmployeeTable rows={employees} />
      </section>

      {/* ── 15.11 Merged activity timeline ───────────────────────────────────── */}
      <section>
        <SectionLabel>Recent activity</SectionLabel>
        <MergedTimeline events={recentActivity} />
      </section>

    </div>
  );
}
