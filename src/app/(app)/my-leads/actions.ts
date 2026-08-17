"use server";

import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import type { LeadStatus } from "@prisma/client";

const LEAD_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  status: true,
  isHighPriority: true,
  lastContactedAt: true,
  nextAction: true,
  nextActionDue: true,
  createdAt: true,
  course: { select: { id: true, name: true, slug: true } },
} as const;

// Derive the row type directly from Prisma so it stays in sync
async function _queryRow() {
  return prisma.lead.findFirst({ select: LEAD_SELECT });
}
export type WorkspaceLeadRow = NonNullable<Awaited<ReturnType<typeof _queryRow>>>;

export type MyLeadsWorkspace = {
  overdue: WorkspaceLeadRow[];
  dueToday: WorkspaceLeadRow[];
  newLeads: WorkspaceLeadRow[];
  pipelineCounts: Record<string, number>;
  totalActive: number;
};

const ACTIVE_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "CONFIRMED",
];

export async function getMyLeadsWorkspace(): Promise<MyLeadsWorkspace> {
  const session = await requirePermissionAction("leads.view");
  const userId = session.user.id;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000 - 1);

  const baseWhere = {
    ownerId: userId,
    status: { in: ACTIVE_STATUSES },
  };

  const [overdue, dueToday, newLeads, ...countResults] = await Promise.all([
    prisma.lead.findMany({
      where: { ...baseWhere, nextActionDue: { lt: todayStart } },
      orderBy: [{ isHighPriority: "desc" }, { nextActionDue: "asc" }],
      take: 30,
      select: LEAD_SELECT,
    }),
    prisma.lead.findMany({
      where: { ...baseWhere, nextActionDue: { gte: todayStart, lte: todayEnd } },
      orderBy: [{ isHighPriority: "desc" }, { nextActionDue: "asc" }],
      take: 30,
      select: LEAD_SELECT,
    }),
    prisma.lead.findMany({
      where: { ownerId: userId, status: "NEW", nextActionDue: null },
      orderBy: [{ isHighPriority: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: LEAD_SELECT,
    }),
    // Individual counts per status
    ...ACTIVE_STATUSES.map((s) =>
      prisma.lead.count({ where: { ownerId: userId, status: s } })
    ),
  ]);

  const pipelineCounts = Object.fromEntries(
    ACTIVE_STATUSES.map((s, i) => [s, countResults[i] as number])
  );
  const totalActive = (countResults as number[]).reduce((a, b) => a + b, 0);

  return { overdue, dueToday, newLeads, pipelineCounts, totalActive };
}

export async function setLeadStatusQuick(
  leadId: string,
  status: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requirePermissionAction("leads.write");

  if (session.user.role === "SALES") {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { ownerId: true },
    });
    if (!lead) return { ok: false, error: "Lead not found." };
    if (lead.ownerId !== session.user.id) {
      return { ok: false, error: "You can only update your own leads." };
    }
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: status as LeadStatus },
  });

  revalidatePath("/my-leads");
  revalidatePath("/leads");
  return { ok: true };
}
