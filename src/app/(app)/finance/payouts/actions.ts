"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { recordActivity } from "@/lib/activity";
import { getAgentOutstandingBalance } from "@/lib/commissions/engine";
import { serializeDecimal } from "@/lib/commissions/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const createPayoutSchema = z.object({
  agentId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "BANK_CHECK", "POSTAL_MOBILE", "CARD", "ONLINE", "OTHER"]),
  reference: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export type PayoutRow = {
  id: string;
  agentId: string;
  agentName: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  notes: string | null;
  status: "PENDING" | "PAID" | "CANCELLED";
  paidAt: string | null;
  createdAt: string;
  createdByName: string | null;
};

export type AgentBalanceRow = {
  agentId: string;
  agentName: string;
  agentEmail: string;
  role: string;
  outstandingBalance: number;
  currency: string;
  earnedCount: number;
  pendingCount: number;
  paidCount: number;
};

export async function listAgentBalances(): Promise<AgentBalanceRow[]> {
  await requirePermissionAction("commissions.view.team");

  const agents = await prisma.user.findMany({
    where: {
      role: { in: ["SALES", "EMPLOYEE", "MANAGER"] },
      salesCommissions: { some: { status: { notIn: ["NO_COMMISSION", "VOID"] } } },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      salesCommissions: {
        select: { status: true },
      },
    },
  });

  const balances = await Promise.all(
    agents.map(async (agent) => {
      const balance = await getAgentOutstandingBalance(agent.id);
      const earnedCount = agent.salesCommissions.filter(
        (c) => c.status === "EARNED" || c.status === "ADJUSTED"
      ).length;
      const pendingCount = agent.salesCommissions.filter(
        (c) => c.status === "PENDING"
      ).length;
      const paidCount = agent.salesCommissions.filter(
        (c) => c.status === "PAID"
      ).length;
      return {
        agentId: agent.id,
        agentName: agent.name ?? agent.email,
        agentEmail: agent.email,
        role: agent.role,
        outstandingBalance: balance,
        currency: "DZD",
        earnedCount,
        pendingCount,
        paidCount,
      };
    })
  );

  return balances.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
}

export async function getAgentPayoutBalance(
  agentId: string
): Promise<{ balance: number; currency: string }> {
  await requirePermissionAction("commissions.view.team");
  const balance = await getAgentOutstandingBalance(agentId);
  return { balance, currency: "DZD" };
}

export async function createPayout(
  input: z.infer<typeof createPayoutSchema>
): Promise<Result<{ id: string }>> {
  const parsed = createPayoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const session = await requirePermissionAction("commissions.payout");
  const d = parsed.data;

  const agent = await prisma.user.findUnique({
    where: { id: d.agentId },
    select: { id: true, name: true, email: true },
  });
  if (!agent) return { ok: false, error: "Agent not found" };

  const balance = await getAgentOutstandingBalance(d.agentId);
  if (d.amount > balance + 0.01) {
    return {
      ok: false,
      error: `Payout amount (${d.amount.toLocaleString()} DZD) exceeds outstanding balance (${balance.toLocaleString()} DZD).`,
    };
  }

  const payout = await prisma.$transaction(async (tx) => {
    const created = await tx.commissionPayout.create({
      data: {
        agentId: d.agentId,
        amount: d.amount,
        currency: "DZD",
        method: d.method,
        reference: d.reference ?? null,
        notes: d.notes ?? null,
        status: "PENDING",
        createdById: session.user.id,
      },
    });

    // Write a PAYOUT ledger debit at agent level (not tied to a specific commission)
    await tx.commissionLedgerEntry.create({
      data: {
        agentId: d.agentId,
        type: "PAYOUT",
        amount: -d.amount,
        description: `Payout #${created.id.slice(-8)} — ${d.method}`,
        referenceId: created.id,
        createdById: session.user.id,
      },
    });

    return created;
  });

  void recordActivity({
    type: "commission.payout_created",
    entity: "CommissionPayout",
    entityId: payout.id,
    userId: session.user.id,
    meta: { agentId: d.agentId, amount: d.amount },
  });

  revalidatePath("/finance/payouts");
  revalidatePath("/my-commissions");
  return { ok: true, data: { id: payout.id } };
}

export async function completePayout(
  payoutId: string
): Promise<Result<void>> {
  const session = await requirePermissionAction("commissions.payout");

  const payout = await prisma.commissionPayout.findUnique({
    where: { id: payoutId },
    select: { id: true, status: true, agentId: true, amount: true },
  });
  if (!payout) return { ok: false, error: "Payout not found" };
  if (payout.status !== "PENDING") {
    return { ok: false, error: "Only pending payouts can be completed" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.commissionPayout.update({
      where: { id: payoutId },
      data: { status: "PAID", paidAt: new Date() },
    });

    // Mark all EARNED/ADJUSTED commissions for this agent as PAID
    await tx.salesCommission.updateMany({
      where: { agentId: payout.agentId, status: { in: ["EARNED", "ADJUSTED"] } },
      data: { status: "PAID", paidAt: new Date() },
    });
  });

  void recordActivity({
    type: "commission.payout_completed",
    entity: "CommissionPayout",
    entityId: payoutId,
    userId: session.user.id,
    meta: { agentId: payout.agentId, amount: serializeDecimal(payout.amount) },
  });

  revalidatePath("/finance/payouts");
  revalidatePath("/my-commissions");
  return { ok: true, data: undefined };
}

export async function cancelPayout(
  payoutId: string
): Promise<Result<void>> {
  const session = await requirePermissionAction("commissions.payout");

  const payout = await prisma.commissionPayout.findUnique({
    where: { id: payoutId },
    select: { id: true, status: true, agentId: true, amount: true },
  });
  if (!payout) return { ok: false, error: "Payout not found" };
  if (payout.status !== "PENDING") {
    return { ok: false, error: "Only pending payouts can be cancelled" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.commissionPayout.update({
      where: { id: payoutId },
      data: { status: "CANCELLED" },
    });

    // Reverse the PAYOUT ledger entry (agent-level, no commissionId)
    await tx.commissionLedgerEntry.create({
      data: {
        agentId: payout.agentId,
        type: "REVERSAL",
        amount: serializeDecimal(payout.amount),
        description: `Cancelled payout #${payoutId.slice(-8)} — reversal`,
        referenceId: payoutId,
        createdById: session.user.id,
      },
    });
  });

  void recordActivity({
    type: "commission.payout_cancelled",
    entity: "CommissionPayout",
    entityId: payoutId,
    userId: session.user.id,
  });

  revalidatePath("/finance/payouts");
  return { ok: true, data: undefined };
}

export async function listPayouts(filter?: {
  agentId?: string;
  status?: "PENDING" | "PAID" | "CANCELLED";
}): Promise<PayoutRow[]> {
  await requirePermissionAction("commissions.payout");

  const rows = await prisma.commissionPayout.findMany({
    where: {
      ...(filter?.agentId ? { agentId: filter.agentId } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      agent: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    agentId: r.agentId,
    agentName: r.agent.name ?? r.agent.email,
    amount: serializeDecimal(r.amount),
    currency: r.currency,
    method: r.method,
    reference: r.reference,
    notes: r.notes,
    status: r.status as "PENDING" | "PAID" | "CANCELLED",
    paidAt: r.paidAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    createdByName: r.createdBy?.name ?? null,
  }));
}
