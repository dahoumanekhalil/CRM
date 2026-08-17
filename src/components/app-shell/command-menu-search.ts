"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";

// Read-only, small result sets. Only queries entities that have navigable UI.
// Each query is gated by the user's permission so results never leak across roles.

export interface CommandSearchResults {
  leads: Array<{ id: string; name: string; subline?: string }>;
  courses: Array<{ id: string; slug: string; name: string; subline?: string }>;
  pages: Array<{ id: string; title: string; slug: string; subline?: string }>;
  students: Array<{ id: string; name: string; subline?: string }>;
  tasks: Array<{ id: string; title: string; subline?: string }>;
  campaigns: Array<{ id: string; name: string; subline?: string }>;
  payments: Array<{ id: string; name: string; subline?: string }>;
}

const EMPTY: CommandSearchResults = {
  leads: [],
  courses: [],
  pages: [],
  students: [],
  tasks: [],
  campaigns: [],
  payments: [],
};

export async function searchCommandMenu(
  query: string
): Promise<CommandSearchResults> {
  const q = query.trim();
  if (q.length < 2) return EMPTY;

  const session = await auth();
  if (!session?.user?.id) return EMPTY;

  const role = session.user.role ?? undefined;
  const insensitive = { mode: "insensitive" as const };
  const isManager = hasPermission(role, "reports.view"); // ADMIN | MANAGER

  const [leads, courses, pages, students, tasks, campaigns, payments] =
    await Promise.all([
      // Leads — SALES_SIDE only
      hasPermission(role, "leads.view")
        ? prisma.lead.findMany({
            where: {
              OR: [
                { firstName: { contains: q, ...insensitive } },
                { lastName: { contains: q, ...insensitive } },
                { email: { contains: q, ...insensitive } },
                { phone: { contains: q } },
              ],
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
            },
            take: 5,
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),

      // Courses — ALL_ROLES
      prisma.course.findMany({
        where: {
          OR: [
            { name: { contains: q, ...insensitive } },
            { slug: { contains: q, ...insensitive } },
            { category: { contains: q, ...insensitive } },
          ],
        },
        select: {
          id: true,
          slug: true,
          name: true,
          category: true,
          status: true,
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // Landing pages — MARKETING_SIDE
      hasPermission(role, "landing-pages.view")
        ? prisma.landingPage.findMany({
            where: {
              OR: [
                { title: { contains: q, ...insensitive } },
                { slug: { contains: q, ...insensitive } },
              ],
            },
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
            take: 5,
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),

      // Students — OPS_SIDE
      hasPermission(role, "students.view")
        ? prisma.student.findMany({
            where: {
              OR: [
                { firstName: { contains: q, ...insensitive } },
                { lastName: { contains: q, ...insensitive } },
                { email: { contains: q, ...insensitive } },
                { phone: { contains: q } },
              ],
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
            take: 5,
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),

      // Tasks — ALL_ROLES, ownership-scoped for non-managers
      prisma.task.findMany({
        where: {
          title: { contains: q, ...insensitive },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          ...(!isManager ? { ownerId: session.user.id } : {}),
        },
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
        },
        take: 5,
        orderBy: { dueDate: { sort: "asc", nulls: "last" } },
      }),

      // Campaigns — MARKETING_SIDE
      hasPermission(role, "campaigns.view")
        ? prisma.campaign.findMany({
            where: { name: { contains: q, ...insensitive } },
            select: { id: true, name: true, status: true },
            take: 5,
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),

      // Payments — FINANCE_SIDE; search by reference or student name
      hasPermission(role, "payments.view")
        ? prisma.payment.findMany({
            where: {
              OR: [
                { reference: { contains: q, ...insensitive } },
                { student: { firstName: { contains: q, ...insensitive } } },
                { student: { lastName: { contains: q, ...insensitive } } },
              ],
            },
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              reference: true,
              student: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            take: 5,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

  const fmt = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });

  return {
    leads: leads.map((l) => ({
      id: l.id,
      name: [l.firstName, l.lastName].filter(Boolean).join(" ") || "Unnamed lead",
      subline: l.email ?? l.phone ?? undefined,
    })),

    courses: courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      subline: [c.category, c.status.charAt(0) + c.status.slice(1).toLowerCase()]
        .filter(Boolean)
        .join(" · ") || undefined,
    })),

    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      subline: p.status.charAt(0) + p.status.slice(1).toLowerCase(),
    })),

    students: students.map((s) => ({
      id: s.id,
      name: [s.firstName, s.lastName].filter(Boolean).join(" ") || "Unnamed student",
      subline: s.email ?? s.phone ?? undefined,
    })),

    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      subline: t.dueDate
        ? `Due ${fmt.format(t.dueDate)}`
        : t.priority !== "NORMAL"
          ? t.priority.charAt(0) + t.priority.slice(1).toLowerCase() + " priority"
          : undefined,
    })),

    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      subline: c.status.charAt(0) + c.status.slice(1).toLowerCase(),
    })),

    payments: payments.map((p) => ({
      id: p.id,
      name: [p.student.firstName, p.student.lastName].filter(Boolean).join(" ") || "Unknown",
      subline: `${Number(p.amount).toLocaleString()} ${p.currency} · ${p.status.charAt(0) + p.status.slice(1).toLowerCase()}`,
    })),
  };
}
