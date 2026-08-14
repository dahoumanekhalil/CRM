"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Small, fast search across the entities we already ship UI for. Results feed
// the command palette — so we keep it read-only, tiny result sets, and only
// touch tables that actually have surfaces the user can jump to.

export interface CommandSearchResults {
  leads: Array<{ id: string; name: string; subline?: string }>;
  courses: Array<{ id: string; slug: string; name: string; subline?: string }>;
  pages: Array<{ id: string; title: string; slug: string; subline?: string }>;
  students: Array<{ id: string; name: string; subline?: string }>;
}

const EMPTY: CommandSearchResults = {
  leads: [],
  courses: [],
  pages: [],
  students: [],
};

export async function searchCommandMenu(
  query: string
): Promise<CommandSearchResults> {
  const q = query.trim();
  if (q.length < 2) return EMPTY;

  const session = await auth();
  if (!session?.user?.id) return EMPTY;

  const insensitive = { mode: "insensitive" as const };

  const [leads, courses, pages, students] = await Promise.all([
    prisma.lead.findMany({
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
        status: true,
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
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
    prisma.landingPage.findMany({
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
    }),
    prisma.student.findMany({
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
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    leads: leads.map((l) => ({
      id: l.id,
      name:
        [l.firstName, l.lastName].filter(Boolean).join(" ") || "Unnamed lead",
      subline: l.email ?? undefined,
    })),
    courses: courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      subline: c.category ?? undefined,
    })),
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      subline: `/p/${p.slug}`,
    })),
    students: students.map((s) => ({
      id: s.id,
      name:
        [s.firstName, s.lastName].filter(Boolean).join(" ") ||
        "Unnamed student",
      subline: s.email ?? undefined,
    })),
  };
}
