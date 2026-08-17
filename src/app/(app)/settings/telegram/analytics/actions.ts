"use server";

import { subDays, subMinutes, subWeeks, format, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AnalyticsSummary = {
  connected: number;
  notConnected: number;
  pendingConn: number;
  disabled: number;
  blocked: number;
  revoked: number;
  sent30d: number;
  failed30d: number;
  pendingQueue: number;
  deliveryRate: number;
};

export type VolumePoint = {
  date: string; // yyyy-MM-dd
  sent: number;
  failed: number;
};

export type TypeBreakdownRow = {
  type: string;
  sent: number;
  failed: number;
  pending: number;
};

export type EmployeeDeliveryRow = {
  userId: string;
  name: string | null;
  email: string;
  role: string;
  connStatus: string | null;
  sent: number;
  failed: number;
  pending: number;
  lastSentAt: string | null;
};

export type RetryStats = {
  totalRetried: number;
  succeededAfterRetry: number;
  permanentlyFailed: number;
  avgAttempts: number;
};

export type SystemHealth = {
  lastSentAt: string | null;
  staleProcessingCount: number;
  oldestPendingAt: string | null;
};

export type AuditEventRow = {
  id: string;
  action: string;
  method: string | null;
  reason: string | null;
  actorName: string | null;
  targetName: string | null;
  createdAt: string;
};

// Telegram-scoped provider filter — captures both "all" and "telegram" records.
const TELEGRAM_PROVIDER = { in: ["all", "telegram"] };

// ── Summary KPIs ───────────────────────────────────────────────────────────────

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  await requirePermissionAction("telegram.admin");
  const since30d = subDays(new Date(), 30);

  const [
    connected, notConnected, pendingConn, disabled, blocked, revoked,
    sent30d, failed30d, pendingQueue,
  ] = await Promise.all([
    prisma.telegramConnection.count({ where: { status: "CONNECTED" } }),
    prisma.user.count({ where: { telegramConnection: { is: null } } }),
    prisma.telegramConnection.count({ where: { status: "PENDING" } }),
    prisma.telegramConnection.count({ where: { status: "DISABLED" } }),
    prisma.telegramConnection.count({ where: { status: "BLOCKED" } }),
    prisma.telegramConnection.count({ where: { status: "REVOKED" } }),
    prisma.scheduledNotification.count({
      where: { provider: TELEGRAM_PROVIDER, status: "SENT", sentAt: { gte: since30d } },
    }),
    prisma.scheduledNotification.count({
      where: { provider: TELEGRAM_PROVIDER, status: "FAILED", updatedAt: { gte: since30d } },
    }),
    prisma.scheduledNotification.count({
      where: { provider: TELEGRAM_PROVIDER, status: "PENDING" },
    }),
  ]);

  const deliveryRate =
    sent30d + failed30d > 0
      ? Math.round((sent30d / (sent30d + failed30d)) * 100)
      : 100;

  return {
    connected, notConnected, pendingConn, disabled, blocked, revoked,
    sent30d, failed30d, pendingQueue, deliveryRate,
  };
}

// ── Volume time-series ─────────────────────────────────────────────────────────

export async function getVolumeTimeSeries(days = 30): Promise<VolumePoint[]> {
  await requirePermissionAction("telegram.admin");
  const since = subDays(new Date(), days);

  const records = await prisma.scheduledNotification.findMany({
    where: {
      provider: TELEGRAM_PROVIDER,
      status: { in: ["SENT", "FAILED"] },
      createdAt: { gte: since },
    },
    select: { status: true, createdAt: true },
  });

  const byDate: Record<string, { sent: number; failed: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
    byDate[d] = { sent: 0, failed: 0 };
  }
  for (const r of records) {
    const d = format(r.createdAt, "yyyy-MM-dd");
    if (byDate[d]) {
      if (r.status === "SENT") byDate[d].sent++;
      else byDate[d].failed++;
    }
  }

  return Object.entries(byDate).map(([date, counts]) => ({ date, ...counts }));
}

// ── Notification type breakdown ────────────────────────────────────────────────

export async function getTypeBreakdown(days = 30): Promise<TypeBreakdownRow[]> {
  await requirePermissionAction("telegram.admin");
  const since = subDays(new Date(), days);

  const rows = await prisma.scheduledNotification.groupBy({
    by: ["type", "status"],
    where: {
      provider: TELEGRAM_PROVIDER,
      createdAt: { gte: since },
      status: { in: ["SENT", "FAILED", "PENDING"] },
    },
    _count: { _all: true },
  });

  const byType: Record<string, TypeBreakdownRow> = {};
  for (const r of rows) {
    if (!byType[r.type]) byType[r.type] = { type: r.type, sent: 0, failed: 0, pending: 0 };
    if (r.status === "SENT") byType[r.type].sent = r._count._all;
    else if (r.status === "FAILED") byType[r.type].failed = r._count._all;
    else if (r.status === "PENDING") byType[r.type].pending = r._count._all;
  }

  return Object.values(byType).sort(
    (a, b) => b.sent + b.failed - (a.sent + a.failed)
  );
}

// ── Employee delivery stats ────────────────────────────────────────────────────

export async function getEmployeeDeliveryStats(): Promise<EmployeeDeliveryRow[]> {
  await requirePermissionAction("telegram.admin");

  const [users, notifGroups, lastSentRows] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        telegramConnection: { select: { status: true } },
      },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.scheduledNotification.groupBy({
      by: ["recipientId", "status"],
      where: {
        provider: TELEGRAM_PROVIDER,
        status: { in: ["SENT", "FAILED", "PENDING"] },
      },
      _count: { _all: true },
    }),
    prisma.scheduledNotification.findMany({
      where: { provider: TELEGRAM_PROVIDER, status: "SENT" },
      select: { recipientId: true, sentAt: true },
      orderBy: { sentAt: "desc" },
      distinct: ["recipientId"],
    }),
  ]);

  const lastSentMap: Record<string, string> = {};
  for (const r of lastSentRows) {
    if (r.sentAt) lastSentMap[r.recipientId] = r.sentAt.toISOString();
  }

  const countMap: Record<string, { sent: number; failed: number; pending: number }> = {};
  for (const r of notifGroups) {
    if (!countMap[r.recipientId]) countMap[r.recipientId] = { sent: 0, failed: 0, pending: 0 };
    if (r.status === "SENT") countMap[r.recipientId].sent = r._count._all;
    else if (r.status === "FAILED") countMap[r.recipientId].failed = r._count._all;
    else if (r.status === "PENDING") countMap[r.recipientId].pending = r._count._all;
  }

  return users.map((u) => ({
    userId: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    connStatus: u.telegramConnection?.status ?? null,
    ...(countMap[u.id] ?? { sent: 0, failed: 0, pending: 0 }),
    lastSentAt: lastSentMap[u.id] ?? null,
  }));
}

// ── Retry stats ────────────────────────────────────────────────────────────────

export async function getRetryStats(): Promise<RetryStats> {
  await requirePermissionAction("telegram.admin");

  const [totalRetried, succeededAfterRetry, permanentlyFailed, avgResult] = await Promise.all([
    prisma.scheduledNotification.count({
      where: { provider: TELEGRAM_PROVIDER, attemptCount: { gt: 1 } },
    }),
    prisma.scheduledNotification.count({
      where: { provider: TELEGRAM_PROVIDER, attemptCount: { gt: 1 }, status: "SENT" },
    }),
    prisma.scheduledNotification.count({
      where: { provider: TELEGRAM_PROVIDER, attemptCount: { gte: 3 }, status: "FAILED" },
    }),
    prisma.scheduledNotification.aggregate({
      where: { provider: TELEGRAM_PROVIDER },
      _avg: { attemptCount: true },
    }),
  ]);

  return {
    totalRetried,
    succeededAfterRetry,
    permanentlyFailed,
    avgAttempts: Math.round((avgResult._avg.attemptCount ?? 1) * 10) / 10,
  };
}

// ── System health ──────────────────────────────────────────────────────────────

export async function getSystemHealth(): Promise<SystemHealth> {
  await requirePermissionAction("telegram.admin");

  const [lastSent, staleProcessingCount, oldestPending] = await Promise.all([
    prisma.scheduledNotification.findFirst({
      where: { provider: TELEGRAM_PROVIDER, status: "SENT" },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }),
    prisma.scheduledNotification.count({
      where: {
        provider: TELEGRAM_PROVIDER,
        status: "PROCESSING",
        lastAttemptAt: { lt: subMinutes(new Date(), 5) },
      },
    }),
    prisma.scheduledNotification.findFirst({
      where: { provider: TELEGRAM_PROVIDER, status: "PENDING" },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true },
    }),
  ]);

  return {
    lastSentAt: lastSent?.sentAt?.toISOString() ?? null,
    staleProcessingCount,
    oldestPendingAt: oldestPending?.scheduledAt?.toISOString() ?? null,
  };
}

// ── Recent audit activity ──────────────────────────────────────────────────────

export async function getRecentAuditActivity(limit = 20): Promise<AuditEventRow[]> {
  await requirePermissionAction("telegram.admin");

  const events = await prisma.telegramConnectionAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { name: true } },
      targetUser: { select: { name: true } },
    },
  });

  return events.map((e) => ({
    id: e.id,
    action: e.action,
    method: e.method ?? null,
    reason: e.reason,
    actorName: e.actor.name,
    targetName: e.targetUser.name,
    createdAt: e.createdAt.toISOString(),
  }));
}

// ── TASK 15.4 — Delivery performance stats ────────────────────────────────────

export type DeliveryStats = {
  sentAllTime: number;
  failedAllTime: number;
  successRate: number;
  failureRate: number;
  retryRate: number;
  avgLatencyMs: number | null; // AVG(sentAt - scheduledAt)
};

export async function getDeliveryStats(): Promise<DeliveryStats> {
  await requirePermissionAction("telegram.admin");

  const [sentAllTime, failedAllTime, retriedCount, sentWithLatency] = await Promise.all([
    prisma.scheduledNotification.count({ where: { provider: TELEGRAM_PROVIDER, status: "SENT" } }),
    prisma.scheduledNotification.count({ where: { provider: TELEGRAM_PROVIDER, status: "FAILED" } }),
    prisma.scheduledNotification.count({ where: { provider: TELEGRAM_PROVIDER, attemptCount: { gt: 1 } } }),
    prisma.scheduledNotification.findMany({
      where: {
        provider: TELEGRAM_PROVIDER,
        status: "SENT",
        sentAt: { not: null },
        createdAt: { gte: subDays(new Date(), 30) },
      },
      select: { sentAt: true, scheduledAt: true },
      take: 500,
    }),
  ]);

  const total = sentAllTime + failedAllTime;
  const successRate = total > 0 ? Math.round((sentAllTime / total) * 100) : 100;
  const failureRate = total > 0 ? Math.round((failedAllTime / total) * 100) : 0;
  const retryRate = total > 0 ? Math.round((retriedCount / total) * 100) : 0;

  let avgLatencyMs: number | null = null;
  if (sentWithLatency.length > 0) {
    const totalMs = sentWithLatency.reduce((sum, r) => {
      if (!r.sentAt) return sum;
      return sum + (r.sentAt.getTime() - r.scheduledAt.getTime());
    }, 0);
    avgLatencyMs = Math.round(totalMs / sentWithLatency.length);
  }

  return { sentAllTime, failedAllTime, successRate, failureRate, retryRate, avgLatencyMs };
}

// ── TASK 15.7 — Failure analytics ─────────────────────────────────────────────

export type FailureReasonRow = { reason: string; count: number };

function categorizeFailure(raw: string | null): string {
  if (!raw) return "Unknown error";
  const s = raw.toLowerCase();
  if (s.includes("bot was blocked") || s.includes("403")) return "Bot blocked by user";
  if (s.includes("chat not found") || s.includes("400")) return "Chat not found";
  if (s.includes("too many requests") || s.includes("429")) return "Rate limited by Telegram";
  if (s.includes("etimedout") || s.includes("timeout")) return "Network timeout";
  if (s.includes("econnrefused") || s.includes("enotfound")) return "Network error";
  if (s.includes("unauthorized") || s.includes("401")) return "Bot token invalid";
  if (s.includes("telegram_bot_token") || s.includes("bot_token")) return "Bot not configured";
  return "Unexpected error";
}

export async function getFailureStats(days = 30): Promise<FailureReasonRow[]> {
  await requirePermissionAction("telegram.admin");

  const failures = await prisma.scheduledNotification.findMany({
    where: {
      provider: TELEGRAM_PROVIDER,
      status: "FAILED",
      createdAt: { gte: subDays(new Date(), days) },
    },
    select: { failureReason: true },
  });

  const counts: Record<string, number> = {};
  for (const f of failures) {
    const label = categorizeFailure(f.failureReason);
    counts[label] = (counts[label] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

// ── TASK 15.9 — Connection analytics ──────────────────────────────────────────

export type ConnectionStatusCount = { status: string; count: number };
export type ConnectionWeekPoint = { week: string; count: number };

export type ConnectionStats = {
  byStatus: ConnectionStatusCount[];
  byWeek: ConnectionWeekPoint[];
};

export async function getConnectionStats(): Promise<ConnectionStats> {
  await requirePermissionAction("telegram.admin");

  const [grouped, allConnections] = await Promise.all([
    prisma.telegramConnection.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.telegramConnection.findMany({
      select: { connectedAt: true },
      where: { connectedAt: { not: null, gte: subWeeks(new Date(), 12) } },
      orderBy: { connectedAt: "asc" },
    }),
  ]);

  const byStatus = grouped.map((r) => ({ status: r.status, count: r._count._all }));

  // Group by ISO week start
  const weekMap: Record<string, number> = {};
  for (const c of allConnections) {
    if (!c.connectedAt) continue;
    const weekStart = format(startOfWeek(c.connectedAt, { weekStartsOn: 1 }), "yyyy-MM-dd");
    weekMap[weekStart] = (weekMap[weekStart] ?? 0) + 1;
  }
  const byWeek = Object.entries(weekMap)
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week));

  return { byStatus, byWeek };
}

// ── TASK 15.11 — Merged activity timeline ─────────────────────────────────────

export type MergedActivityEvent = {
  id: string;
  kind: "audit" | "notification";
  // audit fields
  action?: string;
  method?: string | null;
  reason?: string | null;
  actorName?: string | null;
  targetName?: string | null;
  // notification fields
  notifType?: string;
  recipientName?: string | null;
  status?: string;
  failureReason?: string | null;
  createdAt: string;
};

export async function getMergedActivity(limit = 20): Promise<MergedActivityEvent[]> {
  await requirePermissionAction("telegram.admin");

  const [audits, notifications] = await Promise.all([
    prisma.telegramConnectionAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: { select: { name: true } },
        targetUser: { select: { name: true } },
      },
    }),
    prisma.scheduledNotification.findMany({
      where: {
        provider: TELEGRAM_PROVIDER,
        status: { in: ["SENT", "FAILED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: { recipient: { select: { name: true } } },
    }),
  ]);

  const auditEvents: MergedActivityEvent[] = audits.map((e) => ({
    id: `audit-${e.id}`,
    kind: "audit",
    action: e.action,
    method: e.method ?? null,
    reason: e.reason,
    actorName: e.actor.name,
    targetName: e.targetUser.name,
    createdAt: e.createdAt.toISOString(),
  }));

  const notifEvents: MergedActivityEvent[] = notifications.map((n) => ({
    id: `notif-${n.id}`,
    kind: "notification",
    notifType: n.type,
    recipientName: n.recipient.name,
    status: n.status,
    failureReason: n.failureReason ?? null,
    createdAt: n.updatedAt.toISOString(),
  }));

  return [...auditEvents, ...notifEvents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
