"use server";

import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { serializeDecimal } from "@/lib/commissions/types";
import { getAgentOutstandingBalance } from "@/lib/commissions/engine";

export type MyCommissionRow = {
  id: string;
  registrationId: string;
  studentName: string;
  courseName: string;
  sessionTitle: string;
  fixedAmount: number;
  adjustedAmount: number;
  finalAmount: number;
  status: string;
  scenario: number | null;
  earnedAt: string | null;
  paidAt: string | null;
  currency: string;
};

export type MyCommissionSummary = {
  totalEarned: number;
  totalPaid: number;
  outstandingBalance: number;
  pendingCount: number;
  earnedCount: number;
  adjustedCount: number;
  paidCount: number;
  currency: string;
};

export type MyLedgerRow = {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
};

export async function getMyCommissions(): Promise<{
  summary: MyCommissionSummary;
  commissions: MyCommissionRow[];
  ledger: MyLedgerRow[];
}> {
  const session = await requirePermissionAction("commissions.view.own");
  const agentId = session.user.id;

  const [commissions, ledgerEntries] = await Promise.all([
    prisma.salesCommission.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        registration: {
          select: {
            student: { select: { firstName: true, lastName: true } },
            session: {
              select: {
                title: true,
                course: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.commissionLedgerEntry.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const outstandingBalance = await getAgentOutstandingBalance(agentId);

  const rows: MyCommissionRow[] = commissions.map((c) => ({
    id: c.id,
    registrationId: c.registrationId,
    studentName: `${c.registration.student.firstName} ${c.registration.student.lastName ?? ""}`.trim(),
    courseName: c.registration.session.course.name,
    sessionTitle: c.registration.session.title ?? c.registration.session.course.name,
    fixedAmount: serializeDecimal(c.fixedAmount),
    adjustedAmount: serializeDecimal(c.adjustedAmount),
    finalAmount: serializeDecimal(c.finalAmount),
    status: c.status,
    scenario: c.scenario,
    earnedAt: c.earnedAt?.toISOString() ?? null,
    paidAt: c.paidAt?.toISOString() ?? null,
    currency: "DZD",
  }));

  const totalEarned = commissions
    .filter((c) => ["EARNED", "ADJUSTED", "PAID"].includes(c.status))
    .reduce((sum, c) => sum + serializeDecimal(c.finalAmount), 0);

  const totalPaid = commissions
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + serializeDecimal(c.finalAmount), 0);

  const summary: MyCommissionSummary = {
    totalEarned,
    totalPaid,
    outstandingBalance,
    pendingCount: commissions.filter((c) => c.status === "PENDING").length,
    earnedCount: commissions.filter((c) => c.status === "EARNED").length,
    adjustedCount: commissions.filter((c) => c.status === "ADJUSTED").length,
    paidCount: commissions.filter((c) => c.status === "PAID").length,
    currency: "DZD",
  };

  const ledger: MyLedgerRow[] = ledgerEntries.map((e) => ({
    id: e.id,
    type: e.type,
    amount: serializeDecimal(e.amount),
    description: e.description,
    createdAt: e.createdAt.toISOString(),
  }));

  return { summary, commissions: rows, ledger };
}
