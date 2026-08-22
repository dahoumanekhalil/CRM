"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { recordActivity } from "@/lib/activity";
import { serializeDecimal } from "@/lib/commissions/types";
import { getAgentOutstandingBalance } from "@/lib/commissions/engine";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type TeamCommissionRow = {
  agentId: string;
  agentName: string;
  agentRole: string;
  totalEarned: number;
  totalPaid: number;
  outstandingBalance: number;
  earnedCount: number;
  pendingCount: number;
  paidCount: number;
  currency: string;
};

export type AgentCommissionDetail = {
  agentId: string;
  agentName: string;
  commissions: Array<{
    id: string;
    registrationId: string;
    studentName: string;
    courseName: string;
    fixedAmount: number;
    adjustedAmount: number;
    finalAmount: number;
    status: string;
    scenario: number | null;
    earnedAt: string | null;
    paidAt: string | null;
  }>;
  ledger: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
  outstandingBalance: number;
};

const adjustSchema = z.object({
  commissionId: z.string().min(1),
  adjustmentAmount: z.number(),
  reason: z.string().min(3).max(500),
});

export async function getTeamCommissionOverview(): Promise<TeamCommissionRow[]> {
  await requirePermissionAction("commissions.view.team");

  const agents = await prisma.user.findMany({
    where: { role: { in: ["SALES", "EMPLOYEE", "MANAGER"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      salesCommissions: {
        select: { status: true, finalAmount: true },
      },
    },
  });

  const rows = await Promise.all(
    agents
      .filter((a) => a.salesCommissions.length > 0)
      .map(async (agent) => {
        const balance = await getAgentOutstandingBalance(agent.id);
        const active = agent.salesCommissions.filter(
          (c) => !["NO_COMMISSION", "VOID"].includes(c.status)
        );
        const totalEarned = active
          .filter((c) => ["EARNED", "ADJUSTED", "PAID"].includes(c.status))
          .reduce((sum, c: { finalAmount: unknown }) => sum + serializeDecimal(c.finalAmount as Parameters<typeof serializeDecimal>[0]), 0);
        const totalPaid = active
          .filter((c) => c.status === "PAID")
          .reduce((sum, c: { finalAmount: unknown }) => sum + serializeDecimal(c.finalAmount as Parameters<typeof serializeDecimal>[0]), 0);

        return {
          agentId: agent.id,
          agentName: agent.name ?? agent.email,
          agentRole: agent.role,
          totalEarned,
          totalPaid,
          outstandingBalance: balance,
          earnedCount: active.filter(
            (c) => c.status === "EARNED" || c.status === "ADJUSTED"
          ).length,
          pendingCount: active.filter((c) => c.status === "PENDING").length,
          paidCount: active.filter((c) => c.status === "PAID").length,
          currency: "DZD",
        };
      })
  );

  return rows.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
}

export async function getAgentCommissionDetail(
  agentId: string
): Promise<AgentCommissionDetail | null> {
  await requirePermissionAction("commissions.view.team");

  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, email: true },
  });
  if (!agent) return null;

  const [commissions, ledgerEntries, balance] = await Promise.all([
    prisma.salesCommission.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        registration: {
          select: {
            student: { select: { firstName: true, lastName: true } },
            session: { select: { title: true, course: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.commissionLedgerEntry.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getAgentOutstandingBalance(agentId),
  ]);

  return {
    agentId,
    agentName: agent.name ?? agent.email,
    commissions: commissions.map((c) => ({
      id: c.id,
      registrationId: c.registrationId,
      studentName: `${c.registration.student.firstName} ${c.registration.student.lastName ?? ""}`.trim(),
      courseName: c.registration.session.course.name,
      fixedAmount: serializeDecimal(c.fixedAmount),
      adjustedAmount: serializeDecimal(c.adjustedAmount),
      finalAmount: serializeDecimal(c.finalAmount),
      status: c.status,
      scenario: c.scenario,
      earnedAt: c.earnedAt?.toISOString() ?? null,
      paidAt: c.paidAt?.toISOString() ?? null,
    })),
    ledger: ledgerEntries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: serializeDecimal(e.amount),
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    })),
    outstandingBalance: balance,
  };
}

export async function manuallyAdjustCommission(
  input: z.infer<typeof adjustSchema>
): Promise<Result<void>> {
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const session = await requirePermissionAction("commissions.write");
  const d = parsed.data;

  const commission = await prisma.salesCommission.findUnique({
    where: { id: d.commissionId },
    select: { id: true, agentId: true, status: true, finalAmount: true },
  });
  if (!commission) return { ok: false, error: "Commission not found" };
  if (commission.status === "PAID") {
    return { ok: false, error: "Cannot adjust a commission that has already been paid" };
  }
  if (commission.status === "VOID") {
    return { ok: false, error: "Cannot adjust a voided commission" };
  }

  const currentFinal = serializeDecimal(commission.finalAmount);
  const newFinal = Math.max(0, currentFinal + d.adjustmentAmount);

  await prisma.$transaction(async (tx) => {
    await tx.salesCommission.update({
      where: { id: d.commissionId },
      data: {
        adjustedAmount: { increment: d.adjustmentAmount },
        finalAmount: newFinal,
        status: "ADJUSTED",
      },
    });

    await tx.commissionLedgerEntry.create({
      data: {
        commissionId: d.commissionId,
        agentId: commission.agentId,
        type: "MANUAL_ADJUSTMENT",
        amount: d.adjustmentAmount,
        description: d.reason,
        createdById: session.user.id,
      },
    });
  });

  void recordActivity({
    type: "commission.manual_adjusted",
    entity: "SalesCommission",
    entityId: d.commissionId,
    userId: session.user.id,
    meta: { adjustmentAmount: d.adjustmentAmount, reason: d.reason },
  });

  revalidatePath("/commissions/manage");
  revalidatePath("/my-commissions");
  return { ok: true, data: undefined };
}

export async function voidCommission(
  commissionId: string,
  reason: string
): Promise<Result<void>> {
  const session = await requirePermissionAction("commissions.write");

  const commission = await prisma.salesCommission.findUnique({
    where: { id: commissionId },
    select: { id: true, agentId: true, status: true, finalAmount: true },
  });
  if (!commission) return { ok: false, error: "Commission not found" };
  if (commission.status === "PAID") {
    return { ok: false, error: "Cannot void a paid commission" };
  }
  if (commission.status === "VOID") {
    return { ok: false, error: "Already voided" };
  }

  const finalAmount = serializeDecimal(commission.finalAmount);

  await prisma.$transaction(async (tx) => {
    await tx.salesCommission.update({
      where: { id: commissionId },
      data: { status: "VOID", voidedAt: new Date(), notes: reason },
    });

    if (finalAmount > 0) {
      await tx.commissionLedgerEntry.create({
        data: {
          commissionId,
          agentId: commission.agentId,
          type: "VOID",
          amount: -finalAmount,
          description: `Commission voided: ${reason}`,
          createdById: session.user.id,
        },
      });
    }
  });

  void recordActivity({
    type: "commission.voided",
    entity: "SalesCommission",
    entityId: commissionId,
    userId: session.user.id,
    meta: { reason },
  });

  revalidatePath("/commissions/manage");
  revalidatePath("/my-commissions");
  return { ok: true, data: undefined };
}
