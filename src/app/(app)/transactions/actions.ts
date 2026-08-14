"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/schemas/payment";

const requireViewPayments = () => requirePermissionAction("payments.view");

function serializeAmount(amount: unknown): number {
  if (amount === null || amount === undefined) return 0;
  const n = Number(String(amount));
  return Number.isFinite(n) ? n : 0;
}

export type TransactionRow = {
  id: string;
  amount: number;
  currency: string;
  method: (typeof PAYMENT_METHODS)[number];
  status: (typeof PAYMENT_STATUSES)[number];
  reference: string | null;
  notes: string | null;
  paidAt: Date | null;
  createdAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
  };
  registration: {
    session: {
      title: string | null;
      startDate: Date | null;
      course: { name: string; slug: string };
    };
  } | null;
};

export type TransactionSummary = {
  completedByCurrency: Record<string, number>;
  pendingTotal: number;
  refundedCount: number;
  totalCount: number;
};

export type ListTransactionsInput = {
  from?: string;
  to?: string;
  status?: string;
  method?: string;
  currency?: string;
  q?: string;
  page: number;
  pageSize: number;
};

export async function listTransactions(
  input: ListTransactionsInput
): Promise<{ rows: TransactionRow[]; total: number; summary: TransactionSummary }> {
  await requireViewPayments();

  const where: Prisma.PaymentWhereInput = {};

  // Date-range filter on paidAt
  if (input.from || input.to) {
    where.paidAt = {};
    if (input.from) {
      const fromDate = new Date(input.from);
      if (!Number.isNaN(fromDate.getTime())) {
        (where.paidAt as Prisma.DateTimeFilter).gte = fromDate;
      }
    }
    if (input.to) {
      const toDate = new Date(input.to);
      if (!Number.isNaN(toDate.getTime())) {
        // Include the whole "to" day
        toDate.setHours(23, 59, 59, 999);
        (where.paidAt as Prisma.DateTimeFilter).lte = toDate;
      }
    }
  }

  if (input.status && input.status !== "ALL") {
    where.status = input.status as (typeof PAYMENT_STATUSES)[number];
  }

  if (input.method && input.method !== "ALL") {
    where.method = input.method as (typeof PAYMENT_METHODS)[number];
  }

  if (input.currency && input.currency !== "ALL") {
    where.currency = input.currency;
  }

  if (input.q) {
    const term = input.q.trim();
    where.OR = [
      { reference: { contains: term, mode: "insensitive" } },
      {
        student: {
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const page = Math.max(1, input.page);
  const pageSize = Math.min(200, Math.max(5, input.pageSize));

  const [rowsRaw, total, completedByGroup, pendingAgg, refundedCount] =
    await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          reference: true,
          notes: true,
          paidAt: true,
          createdAt: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          registration: {
            select: {
              session: {
                select: {
                  title: true,
                  startDate: true,
                  course: {
                    select: { name: true, slug: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
      // Summary: completed amounts grouped by currency
      prisma.payment.groupBy({
        by: ["currency"],
        where: { ...where, status: "COMPLETED" },
        _sum: { amount: true },
      }),
      // Summary: pending total
      prisma.payment.aggregate({
        where: { ...where, status: "PENDING" },
        _sum: { amount: true },
      }),
      // Summary: refunded count
      prisma.payment.count({
        where: { ...where, status: "REFUNDED" },
      }),
    ]);

  const rows: TransactionRow[] = rowsRaw.map((p) => ({
    ...p,
    amount: serializeAmount(p.amount),
  }));

  const completedByCurrency: Record<string, number> = {};
  for (const g of completedByGroup) {
    completedByCurrency[g.currency] = serializeAmount(g._sum.amount);
  }

  const summary: TransactionSummary = {
    completedByCurrency,
    pendingTotal: serializeAmount(pendingAgg._sum.amount),
    refundedCount,
    totalCount: total,
  };

  return { rows, total, summary };
}
