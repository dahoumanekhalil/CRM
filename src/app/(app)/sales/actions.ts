"use server";

import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import type { Prisma } from "@prisma/client";

// ── Sales Manager workspace ────────────────────────────────────────────────────

export async function getSalesWorkspaceData() {
  await requirePermissionAction("sales.view");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000 - 1);

  const [
    totalLeads,
    unassigned,
    assigned,
    followUpsToday,
    overdueFollowUps,
    confirmed,
    registered,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { ownerId: null } }),
    prisma.lead.count({ where: { ownerId: { not: null } } }),
    prisma.lead.count({ where: { nextActionDue: { gte: todayStart, lte: todayEnd } } }),
    prisma.lead.count({
      where: {
        nextActionDue: { lt: todayStart },
        status: { notIn: ["LOST", "REGISTERED", "NOT_INTERESTED", "UNREACHABLE"] },
      },
    }),
    prisma.lead.count({ where: { status: "CONFIRMED" } }),
    prisma.lead.count({ where: { status: "REGISTERED" } }),
  ]);

  return {
    totalLeads,
    unassigned,
    assigned,
    followUpsToday,
    overdueFollowUps,
    confirmed,
    registered,
  };
}

export type SalesWorkspaceKpis = Awaited<ReturnType<typeof getSalesWorkspaceData>>;

// ── Team workload ──────────────────────────────────────────────────────────────

export async function getSalesTeamDetails() {
  await requirePermissionAction("sales.view");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000 - 1);

  const reps = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER", "SALES"] } },
    select: { id: true, name: true, email: true, role: true, image: true },
    orderBy: { name: "asc" },
  });

  const stats = await Promise.all(
    reps.map(async (rep) => {
      const [
        assigned,
        newLeads,
        dueToday,
        overdue,
        interested,
        confirmed,
        registered,
      ] = await Promise.all([
        prisma.lead.count({
          where: { ownerId: rep.id, status: { notIn: ["LOST", "NOT_INTERESTED", "UNREACHABLE"]  } },
        }),
        prisma.lead.count({ where: { ownerId: rep.id, status: "NEW" } }),
        prisma.lead.count({
          where: { ownerId: rep.id, nextActionDue: { gte: todayStart, lte: todayEnd } },
        }),
        prisma.lead.count({
          where: {
            ownerId: rep.id,
            nextActionDue: { lt: todayStart },
            status: { notIn: ["LOST", "REGISTERED", "NOT_INTERESTED", "UNREACHABLE"]  },
          },
        }),
        prisma.lead.count({ where: { ownerId: rep.id, status: "INTERESTED" } }),
        prisma.lead.count({ where: { ownerId: rep.id, status: "CONFIRMED" } }),
        prisma.lead.count({ where: { ownerId: rep.id, status: "REGISTERED" } }),
      ]);

      return { ...rep, assigned, newLeads, dueToday, overdue, interested, confirmed, registered };
    })
  );

  return stats;
}

export type SalesTeamDetailRow = Awaited<ReturnType<typeof getSalesTeamDetails>>[number];

// ── Unassigned leads for inbox ────────────────────────────────────────────────

export async function listUnassignedLeadsForManager(options?: {
  courseId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermissionAction("sales.view");

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, options?.pageSize ?? 50);

  const where: Prisma.LeadWhereInput = { ownerId: null };
  if (options?.courseId) where.courseId = options.courseId;
  if (options?.q) {
    const term = options.q.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        course: { select: { id: true, name: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { rows, total, page, pageSize };
}

export type UnassignedLeadManagerRow = Awaited<ReturnType<typeof listUnassignedLeadsForManager>>["rows"][number];

// ── Sales funnel ──────────────────────────────────────────────────────────────

export async function getSalesFunnel() {
  await requirePermissionAction("sales.view");

  const [
    newLeads,
    contacted,
    interested,
    followUp,
    confirmed,
    registered,
    lost,
    notInterested,
    unreachable,
  ] = await Promise.all([
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({ where: { status: "CONTACTED" } }),
    prisma.lead.count({ where: { status: "INTERESTED" } }),
    prisma.lead.count({ where: { status: "FOLLOW_UP" } }),
    prisma.lead.count({ where: { status: "CONFIRMED" } }),
    prisma.lead.count({ where: { status: "REGISTERED" } }),
    prisma.lead.count({ where: { status: "LOST" } }),
    prisma.lead.count({ where: { status: "NOT_INTERESTED" } }),
    prisma.lead.count({ where: { status: "UNREACHABLE" } }),
  ]);

  const total = newLeads + contacted + interested + followUp + confirmed + registered;
  const conversionRate = total > 0 ? Math.round((registered / total) * 100) : 0;

  return {
    stages: [
      { key: "NEW", label: "New", count: newLeads },
      { key: "CONTACTED", label: "Contacted", count: contacted },
      { key: "INTERESTED", label: "Interested", count: interested },
      { key: "FOLLOW_UP", label: "Follow-up", count: followUp },
      { key: "CONFIRMED", label: "Confirmed", count: confirmed },
      { key: "REGISTERED", label: "Registered", count: registered },
    ],
    dropped: { lost, notInterested, unreachable },
    total,
    conversionRate,
  };
}

export type SalesFunnel = Awaited<ReturnType<typeof getSalesFunnel>>;

// ── Session-level sales stats ─────────────────────────────────────────────────

export async function getSessionSalesStats(limit = 10) {
  await requirePermissionAction("sales.view");

  const sessions = await prisma.courseSession.findMany({
    where: {
      endDate: { gte: new Date() },
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: { startDate: "asc" },
    take: limit,
    include: {
      course: { select: { name: true } },
      _count: {
        select: {
          registrations: true,
        },
      },
    },
  });

  const results = await Promise.all(
    sessions.map(async (s) => {
      const [confirmed, registered, leadsCount] = await Promise.all([
        prisma.registration.count({
          where: { sessionId: s.id, status: "CONFIRMED" },
        }),
        prisma.registration.count({
          where: { sessionId: s.id, status: { in: ["CONFIRMED", "ATTENDING", "COMPLETED"] } },
        }),
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*)::bigint FROM "Lead" WHERE "interestedSessionId" = ${s.id}
        `.then(r => Number(r[0]?.count ?? 0)),
      ]);

      const available = Math.max(0, s.capacity - s._count.registrations);
      return {
        id: s.id,
        courseName: s.course.name,
        title: s.title,
        startDate: s.startDate,
        capacity: s.capacity,
        registrations: s._count.registrations,
        available,
        confirmed,
        registered,
        interestedLeads: leadsCount,
        status: s.status,
      };
    })
  );

  return results;
}

export type SessionSalesRow = Awaited<ReturnType<typeof getSessionSalesStats>>[number];
