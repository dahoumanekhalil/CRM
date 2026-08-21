import "server-only";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

// One month, one number. Comparison periods are the prior N days so a delta
// of "+18% vs previous 30 days" is meaningful without needing calendar weeks.

const WINDOW_DAYS = 30;

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    // Growing from zero has no percentage — surface null so the UI shows "—".
    return current > 0 ? null : 0;
  }
  return ((current - previous) / previous) * 100;
}

export interface Kpi {
  value: number;
  deltaPct: number | null;
  comparisonLabel: string;
  context?: string;
}

export interface RevenueKpi extends Kpi {
  // Revenue is per-currency; we surface the top currency on the card and stash
  // the rest for a small "+2 other currencies" hint.
  currency: string;
  otherCurrencies: number;
}

async function sumRevenueByCurrency(
  from: Date,
  to?: Date
): Promise<Record<string, number>> {
  const grouped = await prisma.payment.groupBy({
    by: ["currency"],
    where: {
      status: "COMPLETED",
      paidAt: to ? { gte: from, lte: to } : { gte: from },
    },
    _sum: { amount: true },
  });
  const out: Record<string, number> = {};
  for (const row of grouped) {
    const amount = row._sum.amount ? Number(row._sum.amount.toString()) : 0;
    if (Number.isFinite(amount) && amount > 0) out[row.currency] = amount;
  }
  return out;
}

export async function getDashboardKpis(): Promise<{
  newRegistrations: Kpi;
  activeCourses: Kpi;
  newLeads: Kpi;
  revenue: RevenueKpi;
}> {
  const now = new Date();
  const windowStart = startOfDay(subDays(now, WINDOW_DAYS - 1));
  const prevWindowStart = startOfDay(subDays(now, WINDOW_DAYS * 2 - 1));
  const prevWindowEnd = endOfDay(subDays(now, WINDOW_DAYS));

  const [
    regsNow,
    regsPrev,
    activeCoursesNow,
    activeCoursesPrev,
    newLeadsNow,
    newLeadsPrev,
    revenueNow,
    revenuePrev,
  ] = await Promise.all([
    // New session registrations in the current window.
    prisma.registration.count({
      where: { registeredAt: { gte: windowStart } },
    }),
    prisma.registration.count({
      where: { registeredAt: { gte: prevWindowStart, lte: prevWindowEnd } },
    }),

    // Active (published) courses.
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.course.count({
      where: { status: "PUBLISHED", updatedAt: { lt: windowStart } },
    }),

    // New leads.
    prisma.lead.count({ where: { createdAt: { gte: windowStart } } }),
    prisma.lead.count({
      where: { createdAt: { gte: prevWindowStart, lte: prevWindowEnd } },
    }),

    // Revenue — completed payments per currency.
    sumRevenueByCurrency(windowStart),
    sumRevenueByCurrency(prevWindowStart, prevWindowEnd),
  ]);

  const compare = `vs previous ${WINDOW_DAYS} days`;

  const revenueEntries = Object.entries(revenueNow).sort(
    (a, b) => b[1] - a[1]
  );
  const top = revenueEntries[0];
  const topCurrency = top?.[0] ?? "USD";
  const topAmountNow = top?.[1] ?? 0;
  const topAmountPrev = revenuePrev[topCurrency] ?? 0;

  return {
    newRegistrations: {
      value: regsNow,
      deltaPct: pctChange(regsNow, regsPrev),
      comparisonLabel: compare,
      context: "Session registrations",
    },
    activeCourses: {
      value: activeCoursesNow,
      deltaPct: pctChange(activeCoursesNow, activeCoursesPrev),
      comparisonLabel: compare,
    },
    newLeads: {
      value: newLeadsNow,
      deltaPct: pctChange(newLeadsNow, newLeadsPrev),
      comparisonLabel: compare,
      context: `In the last ${WINDOW_DAYS} days`,
    },
    revenue: {
      value: topAmountNow,
      deltaPct: pctChange(topAmountNow, topAmountPrev),
      comparisonLabel: compare,
      currency: topCurrency,
      otherCurrencies: Math.max(0, revenueEntries.length - 1),
    },
  };
}

export interface UpcomingSessionRow {
  id: string;
  title: string | null;
  startDate: Date;
  endDate: Date;
  city: string | null;
  status: string;
  courseName: string;
  courseSlug: string;
  registrations: number;
  capacity: number;
}

export async function getUpcomingSessions(
  limit = 5
): Promise<UpcomingSessionRow[]> {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const rows = await prisma.courseSession.findMany({
    where: {
      startDate: { gte: now, lte: weekAhead },
      status: { notIn: ["CANCELLED", "COMPLETED", "DRAFT"] },
    },
    orderBy: { startDate: "asc" },
    take: limit,
    include: {
      course: { select: { name: true, slug: true } },
      _count: {
        select: {
          registrations: {
            where: {
              status: { in: ["PENDING", "CONFIRMED", "ATTENDING"] },
            },
          },
        },
      },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    startDate: s.startDate,
    endDate: s.endDate,
    city: s.city,
    status: s.status,
    courseName: s.course.name,
    courseSlug: s.course.slug,
    registrations: s._count.registrations,
    capacity: s.capacity,
  }));
}

export interface RevenuePerDayPoint {
  date: string;
  revenue: number;
}

// Series driving the "Revenue over time" chart on the dashboard. Uses the top
// currency from the KPI so the chart matches the headline number.
export async function getRevenuePerDay(
  currency: string,
  days = WINDOW_DAYS
): Promise<RevenuePerDayPoint[]> {
  const now = new Date();
  const windowStart = startOfDay(subDays(now, days - 1));
  const rows = await prisma.payment.findMany({
    where: {
      status: "COMPLETED",
      currency,
      paidAt: { gte: windowStart },
    },
    select: { paidAt: true, amount: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const d = subDays(now, days - 1 - i);
    buckets.set(toIsoDate(d), 0);
  }
  for (const r of rows) {
    if (!r.paidAt) continue;
    const key = toIsoDate(r.paidAt);
    const amt = Number(r.amount.toString());
    if (!Number.isFinite(amt)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + amt);
  }
  return Array.from(buckets, ([date, revenue]) => ({ date, revenue }));
}

export interface LeadsPerDayPoint {
  date: string; // ISO yyyy-MM-dd
  leads: number;
}

export async function getLeadsPerDay(days = WINDOW_DAYS): Promise<LeadsPerDayPoint[]> {
  const now = new Date();
  const windowStart = startOfDay(subDays(now, days - 1));

  const rows = await prisma.lead.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { createdAt: true },
  });

  // Bucket by yyyy-MM-dd. Small dataset per window — a client-side reduce is fine.
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const d = subDays(now, days - 1 - i);
    buckets.set(toIsoDate(d), 0);
  }
  for (const r of rows) {
    const key = toIsoDate(r.createdAt);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets, ([date, leads]) => ({ date, leads }));
}

export interface LeadSourcePoint {
  source: string;
  count: number;
}

export async function getLeadSourceMix(limit = 6): Promise<LeadSourcePoint[]> {
  const grouped = await prisma.lead.groupBy({
    by: ["source"],
    _count: { _all: true },
    orderBy: { _count: { source: "desc" } },
  });

  const withLabel = grouped.map((row) => ({
    source: row.source?.trim() || "Unknown",
    count: row._count._all,
  }));

  // Fold multiple nulls or empties into a single "Unknown" bucket.
  const merged = new Map<string, number>();
  for (const { source, count } of withLabel) {
    merged.set(source, (merged.get(source) ?? 0) + count);
  }

  return Array.from(merged, ([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function fmtTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Role-specific dashboard data
// ──────────────────────────────────────────────────────────────────────────────

// --- Trainer ---

export interface TrainerDashboardRow {
  id: string;
  name: string;
  courseSlug: string;
  startTime: string;
  studentCount: number;
}

export interface TrainerDashboardData {
  tomorrowSessions: TrainerDashboardRow[];
  todayPresentMap: Record<string, number>; // sessionId → present count today
}

export async function getTrainerDashboardData(
  todaySessionIds: string[]
): Promise<TrainerDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const tomorrowEnd = endOfDay(tomorrowStart);

  const [tomorrowRows, attendanceGroups] = await Promise.all([
    prisma.courseSession.findMany({
      where: {
        startDate: { gte: tomorrowStart, lte: tomorrowEnd },
        status: { notIn: ["CANCELLED", "DRAFT"] },
      },
      orderBy: { startDate: "asc" },
      take: 8,
      include: {
        course: { select: { name: true, slug: true } },
        _count: {
          select: {
            registrations: {
              where: { status: { in: ["PENDING", "CONFIRMED", "ATTENDING"] } },
            },
          },
        },
      },
    }),
    todaySessionIds.length > 0
      ? prisma.attendance.groupBy({
          by: ["sessionId"],
          where: {
            sessionId: { in: todaySessionIds },
            sessionDate: todayStart,
            status: { in: ["PRESENT", "LATE"] },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const todayPresentMap: Record<string, number> = {};
  for (const g of attendanceGroups) {
    todayPresentMap[g.sessionId] = g._count._all;
  }

  return {
    tomorrowSessions: tomorrowRows.map((s) => ({
      id: s.id,
      name: s.title?.trim() || s.course.name,
      courseSlug: s.course.slug,
      startTime: fmtTime(s.startDate),
      studentCount: s._count.registrations,
    })),
    todayPresentMap,
  };
}

// --- Finance ---

export interface FinanceDashboardData {
  pendingCount: number;
  pendingByCurrency: Array<{ currency: string; total: number }>;
  todayCount: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  currency: string;
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [pendingGroups, todayCount, thisMonthGroups, lastMonthGroups] = await Promise.all([
    prisma.payment.groupBy({
      by: ["currency"],
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.count({
      where: { status: "COMPLETED", paidAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.payment.groupBy({
      by: ["currency"],
      where: { status: "COMPLETED", paidAt: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ["currency"],
      where: { status: "COMPLETED", paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const pendingCount = pendingGroups.reduce((s, g) => s + g._count._all, 0);
  const pendingByCurrency = pendingGroups
    .map((g) => ({ currency: g.currency, total: Number(g._sum.amount?.toString() ?? "0") }))
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total);

  const topThisMonth = [...thisMonthGroups].sort(
    (a, b) =>
      Number(b._sum.amount?.toString() ?? "0") - Number(a._sum.amount?.toString() ?? "0")
  )[0];
  const topCurrency = topThisMonth?.currency ?? pendingByCurrency[0]?.currency ?? "DZD";
  const thisMonthRevenue = Number(topThisMonth?._sum.amount?.toString() ?? "0");
  const lastMonthRevenue = Number(
    lastMonthGroups.find((g) => g.currency === topCurrency)?._sum.amount?.toString() ?? "0"
  );

  return {
    pendingCount,
    pendingByCurrency,
    todayCount,
    thisMonthRevenue,
    lastMonthRevenue,
    currency: topCurrency,
  };
}

// --- Marketing ---

export interface MarketingDashboardData {
  publishedPages: number;
  draftPages: number;
  activeCampaigns: number;
  newLeadsThisWeek: number;
  leadsBySource: Array<{ source: string; count: number }>;
}

export async function getMarketingDashboardData(): Promise<MarketingDashboardData> {
  const weekStart = startOfDay(subDays(new Date(), 6));

  const [publishedPages, draftPages, activeCampaigns, newLeadsThisWeek, sourceMix] =
    await Promise.all([
      prisma.landingPage.count({ where: { status: "PUBLISHED" } }),
      prisma.landingPage.count({ where: { status: "DRAFT" } }),
      prisma.campaign.count({ where: { status: { in: ["ACTIVE", "PAUSED"] } } }),
      prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.lead.groupBy({
        by: ["source"],
        where: { createdAt: { gte: weekStart } },
        _count: { _all: true },
        orderBy: { _count: { source: "desc" } },
        take: 5,
      }),
    ]);

  return {
    publishedPages,
    draftPages,
    activeCampaigns,
    newLeadsThisWeek,
    leadsBySource: sourceMix.map((r) => ({
      source: r.source?.trim() || "Unknown",
      count: r._count._all,
    })),
  };
}

// --- Sales Rep ---

export interface SalesRepDashboardData {
  totalMyLeads: number;
  newThisWeek: number;
  overdueFollowUps: number;
  dueTodayFollowUps: number;
  byStatus: Array<{ status: string; count: number }>;
}

export async function getSalesRepDashboardData(
  userId: string
): Promise<SalesRepDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfDay(subDays(now, 6));

  const [total, newThisWeek, overdue, dueToday, grouped] = await Promise.all([
    prisma.lead.count({
      where: { ownerId: userId, status: { notIn: ["LOST", "REGISTERED"] } },
    }),
    prisma.lead.count({ where: { ownerId: userId, createdAt: { gte: weekStart } } }),
    prisma.lead.count({
      where: {
        ownerId: userId,
        nextAction: { not: null },
        nextActionDue: { lt: todayStart },
        status: { notIn: ["LOST", "REGISTERED"] },
      },
    }),
    prisma.lead.count({
      where: {
        ownerId: userId,
        nextAction: { not: null },
        nextActionDue: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["LOST", "REGISTERED"] },
      },
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { ownerId: userId, status: { notIn: ["LOST", "REGISTERED"] } },
      _count: { _all: true },
    }),
  ]);

  return {
    totalMyLeads: total,
    newThisWeek,
    overdueFollowUps: overdue,
    dueTodayFollowUps: dueToday,
    byStatus: grouped.map((r) => ({ status: r.status, count: r._count._all })),
  };
}
