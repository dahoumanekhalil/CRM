import "server-only";
import { differenceInCalendarDays, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requirePermissionAction } from "@/lib/auth-guards";

function serializeAmount(amount: unknown): number {
  if (amount === null || amount === undefined) return 0;
  const n = Number(String(amount));
  return Number.isFinite(n) ? n : 0;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

function toIsoDate(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Resolves the query date range into concrete dates + the equivalent prior
// window (for delta comparisons).
export interface ResolvedRange {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  days: number;
}

export function resolveRange(fromStr: string, toStr: string): ResolvedRange {
  const now = new Date();
  const to = toStr ? new Date(toStr) : now;
  const from = fromStr ? new Date(fromStr) : subDays(now, 29);

  // Normalize to whole-day boundaries.
  const start = startOfDay(from);
  const endInclusive = new Date(to);
  endInclusive.setHours(23, 59, 59, 999);

  const days = differenceInCalendarDays(endInclusive, start) + 1;
  const prevTo = new Date(start);
  prevTo.setMilliseconds(prevTo.getMilliseconds() - 1);
  const prevFrom = subDays(start, days);

  return {
    from: start,
    to: endInclusive,
    prevFrom,
    prevTo,
    days,
  };
}

// Sum of completed payments in the window, per currency.
async function sumRevenue(
  from: Date,
  to: Date
): Promise<Record<string, number>> {
  const grouped = await prisma.payment.groupBy({
    by: ["currency"],
    where: {
      status: "COMPLETED",
      paidAt: { gte: from, lte: to },
    },
    _sum: { amount: true },
  });
  const out: Record<string, number> = {};
  for (const row of grouped) {
    const amt = serializeAmount(row._sum.amount);
    if (amt > 0) out[row.currency] = amt;
  }
  return out;
}

export interface RevenueReport {
  totalByCurrency: Record<string, number>;
  prevByCurrency: Record<string, number>;
  topCurrency: string;
  topAmount: number;
  topDelta: number | null;
  otherCurrencies: number;
  perDay: Array<{ date: string; revenue: number }>;
  completedCount: number;
}

export async function getRevenueReport(
  range: ResolvedRange
): Promise<RevenueReport> {
  await requirePermissionAction("reports.view");
  const [current, previous, completedCount] = await Promise.all([
    sumRevenue(range.from, range.to),
    sumRevenue(range.prevFrom, range.prevTo),
    prisma.payment.count({
      where: {
        status: "COMPLETED",
        paidAt: { gte: range.from, lte: range.to },
      },
    }),
  ]);

  const sorted = Object.entries(current).sort((a, b) => b[1] - a[1]);
  const [topCurrency, topAmount] = sorted[0] ?? ["USD", 0];

  // Build per-day series for the top currency.
  const rows = await prisma.payment.findMany({
    where: {
      status: "COMPLETED",
      currency: topCurrency,
      paidAt: { gte: range.from, lte: range.to },
    },
    select: { paidAt: true, amount: true },
  });
  const buckets = new Map<string, number>();
  for (let i = 0; i < range.days; i += 1) {
    const d = subDays(range.to, range.days - 1 - i);
    buckets.set(toIsoDate(d), 0);
  }
  for (const r of rows) {
    if (!r.paidAt) continue;
    const key = toIsoDate(r.paidAt);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + serializeAmount(r.amount));
  }

  return {
    totalByCurrency: current,
    prevByCurrency: previous,
    topCurrency,
    topAmount,
    topDelta: pctChange(topAmount, previous[topCurrency] ?? 0),
    otherCurrencies: Math.max(0, sorted.length - 1),
    perDay: Array.from(buckets, ([date, revenue]) => ({ date, revenue })),
    completedCount,
  };
}

export interface PipelineReport {
  leads: number;
  converted: number;
  registered: number;
  revenueTopCurrency: string;
  revenueTopAmount: number;
  attendedSessions: number;
}

// Funnel counts for the range. "Registered" = leads with a linked student that
// has at least one registration. Money side is completed payments in-window.
export async function getPipelineReport(
  range: ResolvedRange,
  revenueByCurrency: Record<string, number>
): Promise<PipelineReport> {
  await requirePermissionAction("reports.view");
  const inRange = { gte: range.from, lte: range.to };

  const [leadsInRange, convertedInRange, registered, attendedSessions] =
    await Promise.all([
      prisma.lead.count({ where: { createdAt: inRange } }),
      prisma.lead.count({
        where: { createdAt: inRange, studentId: { not: null } },
      }),
      prisma.lead.count({
        where: {
          createdAt: inRange,
          studentId: { not: null },
          student: { registrations: { some: {} } },
        },
      }),
      prisma.attendance.count({
        where: {
          sessionDate: inRange,
          status: { in: ["PRESENT", "LATE"] },
        },
      }),
    ]);

  const sorted = Object.entries(revenueByCurrency).sort(
    (a, b) => b[1] - a[1]
  );
  const [topCurrency, topAmount] = sorted[0] ?? ["USD", 0];

  return {
    leads: leadsInRange,
    converted: convertedInRange,
    registered,
    revenueTopCurrency: topCurrency,
    revenueTopAmount: topAmount,
    attendedSessions,
  };
}

export interface TopCampaignRow {
  id: string;
  name: string;
  source: string | null;
  status: string;
  leads: number;
  converted: number;
  revenueTop: { currency: string; amount: number } | null;
}

export async function getTopCampaigns(
  range: ResolvedRange,
  limit = 5
): Promise<TopCampaignRow[]> {
  await requirePermissionAction("reports.view");
  const inRange = { gte: range.from, lte: range.to };

  // Query 1: campaigns + their leads in range. We fetch studentId to later
  // attribute revenue — done in ONE query instead of N per-campaign queries.
  const campaigns = await prisma.campaign.findMany({
    where: { leads: { some: { createdAt: inRange } } },
    select: {
      id: true,
      name: true,
      source: true,
      status: true,
      _count: { select: { leads: { where: { createdAt: inRange } } } },
      leads: {
        where: { createdAt: inRange },
        select: { studentId: true },
      },
    },
  });

  // Collect ALL student IDs across every campaign.
  const allStudentIds = Array.from(
    new Set(
      campaigns.flatMap((c) =>
        c.leads.map((l) => l.studentId).filter((v): v is string => Boolean(v))
      )
    )
  );

  // Query 2: ONE grouped payment query for all students at once.
  const allPayments =
    allStudentIds.length > 0
      ? await prisma.payment.groupBy({
          by: ["studentId", "currency"],
          where: {
            status: "COMPLETED",
            studentId: { in: allStudentIds },
            paidAt: inRange,
          },
          _sum: { amount: true },
        })
      : [];

  // Build a lookup: studentId → { currency → amount }.
  const paymentByStudent = new Map<string, Map<string, number>>();
  for (const row of allPayments) {
    if (!row.studentId) continue;
    if (!paymentByStudent.has(row.studentId)) {
      paymentByStudent.set(row.studentId, new Map());
    }
    paymentByStudent
      .get(row.studentId)!
      .set(row.currency, serializeAmount(row._sum.amount));
  }

  // Aggregate per campaign — pure in-process, no extra queries.
  const results: TopCampaignRow[] = campaigns.map((c) => {
    const studentIds = Array.from(
      new Set(
        c.leads.map((l) => l.studentId).filter((v): v is string => Boolean(v))
      )
    );
    const revenueByCurrency = new Map<string, number>();
    for (const sid of studentIds) {
      const byCur = paymentByStudent.get(sid);
      if (!byCur) continue;
      for (const [cur, amt] of byCur) {
        revenueByCurrency.set(cur, (revenueByCurrency.get(cur) ?? 0) + amt);
      }
    }
    const topEntry = Array.from(revenueByCurrency.entries())
      .sort((a, b) => b[1] - a[1])
      .find(([, amt]) => amt > 0);

    return {
      id: c.id,
      name: c.name,
      source: c.source,
      status: c.status,
      leads: c._count.leads,
      converted: c.leads.filter((l) => l.studentId !== null).length,
      revenueTop: topEntry
        ? { currency: topEntry[0], amount: topEntry[1] }
        : null,
    };
  });

  return results
    .sort((a, b) => {
      const ar = a.revenueTop?.amount ?? 0;
      const br = b.revenueTop?.amount ?? 0;
      if (br !== ar) return br - ar;
      return b.leads - a.leads;
    })
    .slice(0, limit);
}

export interface TopCourseRow {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  registrations: number;
  attendedSessions: number;
  revenueTop: { currency: string; amount: number } | null;
}

export async function getTopCourses(
  range: ResolvedRange,
  limit = 5
): Promise<TopCourseRow[]> {
  await requirePermissionAction("reports.view");
  const inRange = { gte: range.from, lte: range.to };

  // Query 1: courses + session IDs + counts. No nested payments — that's
  // where the original version incurred deep per-row nesting.
  const courses = await prisma.course.findMany({
    where: {
      sessions: {
        some: { registrations: { some: { registeredAt: inRange } } },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      sessions: {
        select: {
          id: true,
          _count: {
            select: {
              registrations: { where: { registeredAt: inRange } },
              attendance: {
                where: {
                  sessionDate: inRange,
                  status: { in: ["PRESENT", "LATE"] },
                },
              },
            },
          },
        },
      },
    },
  });

  const sessionIds = courses.flatMap((c) => c.sessions.map((s) => s.id));
  const courseBySessionId = new Map(
    courses.flatMap((c) => c.sessions.map((s) => [s.id, c.id]))
  );

  // Query 2: ONE payment fetch for all sessions in range — O(payments) not
  // O(sessions × payments). Capped at 50k rows (unlikely in practice).
  const paymentDetails =
    sessionIds.length > 0
      ? await prisma.payment.findMany({
          where: {
            status: "COMPLETED",
            paidAt: inRange,
            registration: { sessionId: { in: sessionIds } },
          },
          select: {
            amount: true,
            currency: true,
            registration: { select: { sessionId: true } },
          },
          take: 50_000,
        })
      : [];

  // Aggregate per-course revenue in-process.
  const courseRevenue = new Map<string, Map<string, number>>();
  for (const p of paymentDetails) {
    const sId = p.registration?.sessionId;
    if (!sId) continue;
    const cId = courseBySessionId.get(sId);
    if (!cId) continue;
    if (!courseRevenue.has(cId)) courseRevenue.set(cId, new Map());
    const byCur = courseRevenue.get(cId)!;
    const amt = serializeAmount(p.amount);
    if (amt > 0) byCur.set(p.currency, (byCur.get(p.currency) ?? 0) + amt);
  }

  const rows: TopCourseRow[] = courses.map((c) => {
    const regs = c.sessions.reduce((s, sess) => s + sess._count.registrations, 0);
    const attended = c.sessions.reduce(
      (s, sess) => s + sess._count.attendance,
      0
    );
    const byCur = courseRevenue.get(c.id);
    const top = byCur
      ? Array.from(byCur.entries())
          .sort((a, b) => b[1] - a[1])
          .find(([, amt]) => amt > 0)
      : undefined;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      category: c.category,
      registrations: regs,
      attendedSessions: attended,
      revenueTop: top ? { currency: top[0], amount: top[1] } : null,
    };
  });

  return rows
    .sort((a, b) => {
      const ar = a.revenueTop?.amount ?? 0;
      const br = b.revenueTop?.amount ?? 0;
      if (br !== ar) return br - ar;
      return b.registrations - a.registrations;
    })
    .slice(0, limit);
}

// ── Sales performance per rep ────────────────────────────────────────────────

export interface SalesRepRow {
  userId: string;
  name: string | null;
  email: string;
  leadsInRange: number;
  conversions: number;
  registrations: number;
}

export async function getSalesRepReport(
  range: ResolvedRange
): Promise<SalesRepRow[]> {
  await requirePermissionAction("reports.view");
  const inRange = { gte: range.from, lte: range.to };

  const ownedLeads = await prisma.lead.findMany({
    where: { createdAt: inRange, ownerId: { not: null } },
    select: { ownerId: true },
    distinct: ["ownerId"],
  });
  if (ownedLeads.length === 0) return [];

  const repIds = ownedLeads.map((r) => r.ownerId!);

  const [users, leadCounts, conversionCounts, regCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: repIds } },
      select: { id: true, name: true, email: true },
    }),
    prisma.lead.groupBy({
      by: ["ownerId"],
      where: { createdAt: inRange, ownerId: { in: repIds } },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["ownerId"],
      where: {
        createdAt: inRange,
        ownerId: { in: repIds },
        studentId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.registration.groupBy({
      by: ["salesOwnerId"],
      where: {
        registeredAt: inRange,
        salesOwnerId: { in: repIds },
      },
      _count: { _all: true },
    }),
  ]);

  const leadMap = new Map(leadCounts.map((r) => [r.ownerId, r._count._all]));
  const convMap = new Map(conversionCounts.map((r) => [r.ownerId, r._count._all]));
  const regMap = new Map(regCounts.map((r) => [r.salesOwnerId, r._count._all]));

  return users
    .map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      leadsInRange: leadMap.get(u.id) ?? 0,
      conversions: convMap.get(u.id) ?? 0,
      registrations: regMap.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.leadsInRange - a.leadsInRange);
}

// ── Expenses by category ─────────────────────────────────────────────────────
// Expense model is not in the Prisma typed client (DLL lock) — must use raw SQL.

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  VENUE: "Venue",
  CATERING: "Catering",
  EQUIPMENT: "Equipment",
  PRINTING: "Printing",
  TRANSPORT: "Transport",
  INSTRUCTOR_FEE: "Instructor Fee",
  MARKETING: "Marketing",
  UTILITIES: "Utilities",
  OTHER: "Other",
};

export interface ExpensesReport {
  total: number;
  count: number;
  byCategory: Array<{ category: string; label: string; total: number }>;
}

export async function getExpensesReport(
  range: ResolvedRange
): Promise<ExpensesReport> {
  await requirePermissionAction("reports.view");

  type RawRow = { category: string; total: string | null; cnt: string };
  const rows = await prisma.$queryRaw<RawRow[]>(Prisma.sql`
    SELECT
      category,
      CAST(SUM(amount) AS TEXT)  AS total,
      CAST(COUNT(*)   AS TEXT)   AS cnt
    FROM "Expense"
    WHERE status != 'CANCELLED'
      AND "createdAt" >= ${range.from}
      AND "createdAt" <= ${range.to}
    GROUP BY category
    ORDER BY SUM(amount) DESC
  `);

  const total = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const count = rows.reduce((s, r) => s + Number(r.cnt), 0);

  return {
    total,
    count,
    byCategory: rows.map((r) => ({
      category: r.category,
      label: EXPENSE_CATEGORY_LABELS[r.category] ?? r.category,
      total: Number(r.total ?? 0),
    })),
  };
}

// ── Attendance rate by session ───────────────────────────────────────────────

export interface AttendanceRow {
  sessionId: string;
  courseName: string;
  courseSlug: string;
  startDate: Date;
  city: string | null;
  enrolled: number;
  present: number;
  rate: number; // 0–100
}

export async function getAttendanceReport(
  range: ResolvedRange,
  limit = 10
): Promise<AttendanceRow[]> {
  await requirePermissionAction("reports.view");

  const sessions = await prisma.courseSession.findMany({
    where: {
      startDate: { gte: range.from, lte: range.to },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    orderBy: { startDate: "desc" },
    take: limit,
    select: {
      id: true,
      startDate: true,
      city: true,
      course: { select: { name: true, slug: true } },
      _count: {
        select: {
          registrations: {
            where: { status: { in: ["CONFIRMED", "ATTENDING", "COMPLETED"] } },
          },
          attendance: {
            where: { status: { in: ["PRESENT", "LATE"] } },
          },
        },
      },
    },
  });

  return sessions.map((s) => {
    const enrolled = s._count.registrations;
    const present = s._count.attendance;
    return {
      sessionId: s.id,
      courseName: s.course.name,
      courseSlug: s.course.slug,
      startDate: s.startDate,
      city: s.city,
      enrolled,
      present,
      rate: enrolled > 0 ? Math.round((present / enrolled) * 100) : 0,
    };
  });
}
