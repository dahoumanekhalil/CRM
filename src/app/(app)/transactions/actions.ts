"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/schemas/payment";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/schemas/expense";

const requireViewPayments = () => requirePermissionAction("payments.view");
const requireViewFinance = () => requirePermissionAction("finance.view");

function serializeAmount(amount: unknown): number {
  if (amount === null || amount === undefined) return 0;
  const n = Number(String(amount));
  return Number.isFinite(n) ? n : 0;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentLedgerRow = {
  kind: "payment";
  id: string;
  date: Date;
  amount: number;
  currency: string;
  method: (typeof PAYMENT_METHODS)[number];
  status: (typeof PAYMENT_STATUSES)[number];
  reference: string | null;
  notes: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
  };
  courseName: string | null;
  sessionTitle: string | null;
};

export type ExpenseLedgerRow = {
  kind: "expense";
  id: string;
  date: Date;
  amount: number;
  currency: string;
  title: string;
  category: string;
  categoryLabel: string;
  reference: string | null;
  courseName: string | null;
  sessionTitle: string | null;
};

export type LedgerRow = PaymentLedgerRow | ExpenseLedgerRow;

export type LedgerSummary = {
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  currency: string;
  paymentCount: number;
  expenseCount: number;
};

export type ListLedgerInput = {
  from?: string;
  to?: string;
  status?: string;
  method?: string;
  currency?: string;
  q?: string;
  page: number;
  pageSize: number;
};

// ─── Main query ───────────────────────────────────────────────────────────────

export async function listLedger(
  input: ListLedgerInput
): Promise<{ rows: LedgerRow[]; total: number; summary: LedgerSummary }> {
  // Require both: payments.view for payment rows, finance.view for expense rows
  // We'll still return if only one permission is available by catching the other
  let canViewPayments = true;
  let canViewFinance = true;

  try {
    await requireViewPayments();
  } catch {
    canViewPayments = false;
  }
  try {
    await requireViewFinance();
  } catch {
    canViewFinance = false;
  }

  // Build date filters
  const fromDate = input.from ? new Date(input.from) : null;
  const toDate = input.to ? (() => { const d = new Date(input.to!); d.setHours(23, 59, 59, 999); return d; })() : null;

  const page = Math.max(1, input.page);
  const pageSize = Math.min(200, Math.max(5, input.pageSize));

  // ── Payment rows ─────────────────────────────────────────────────────────
  let paymentRows: PaymentLedgerRow[] = [];
  let paymentTotal = 0;
  let paymentIncome = 0;

  if (canViewPayments) {
    const wherePayment: Prisma.PaymentWhereInput = {};
    if (fromDate && !Number.isNaN(fromDate.getTime())) {
      wherePayment.paidAt = { ...wherePayment.paidAt as object, gte: fromDate };
    }
    if (toDate && !Number.isNaN(toDate.getTime())) {
      wherePayment.paidAt = { ...wherePayment.paidAt as object, lte: toDate };
    }
    if (input.status && input.status !== "ALL") {
      wherePayment.status = input.status as (typeof PAYMENT_STATUSES)[number];
    }
    if (input.method && input.method !== "ALL") {
      wherePayment.method = input.method as (typeof PAYMENT_METHODS)[number];
    }
    if (input.currency && input.currency !== "ALL") {
      wherePayment.currency = input.currency;
    }
    if (input.q) {
      const term = input.q.trim();
      wherePayment.OR = [
        { reference: { contains: term, mode: "insensitive" } },
        { student: { OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
        ]}},
      ];
    }

    const rawPayments = await prisma.payment.findMany({
      where: wherePayment,
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 500,
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
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        registration: {
          select: {
            session: {
              select: { title: true, course: { select: { name: true } } },
            },
          },
        },
      },
    });

    paymentTotal = rawPayments.length;
    paymentRows = rawPayments.map((p) => ({
      kind: "payment" as const,
      id: p.id,
      date: p.paidAt ?? p.createdAt,
      amount: serializeAmount(p.amount),
      currency: p.currency,
      method: p.method,
      status: p.status,
      reference: p.reference,
      notes: p.notes,
      student: p.student,
      courseName: p.registration?.session?.course?.name ?? null,
      sessionTitle: p.registration?.session?.title ?? null,
    }));
    paymentIncome = paymentRows
      .filter((r) => r.status === "COMPLETED" && r.amount > 0)
      .reduce((s, r) => s + r.amount, 0);
  }

  // ── Expense rows ──────────────────────────────────────────────────────────
  let expenseRows: ExpenseLedgerRow[] = [];
  let expenseCount = 0;
  let expenseTotal = 0;

  if (canViewFinance) {
    const expenseConditions: Prisma.Sql[] = [
      Prisma.sql`e.status != 'CANCELLED'::"ExpenseStatus"`,
    ];
    if (fromDate && !Number.isNaN(fromDate.getTime())) {
      expenseConditions.push(Prisma.sql`e."expenseDate" >= ${fromDate}::date`);
    }
    if (toDate && !Number.isNaN(toDate.getTime())) {
      expenseConditions.push(Prisma.sql`e."expenseDate" <= ${toDate}::date`);
    }
    if (input.currency && input.currency !== "ALL") {
      expenseConditions.push(Prisma.sql`e.currency = ${input.currency}`);
    }
    if (input.q) {
      const term = `%${input.q.trim()}%`;
      expenseConditions.push(
        Prisma.sql`(e.title ILIKE ${term} OR e.reference ILIKE ${term})`
      );
    }

    const expenseWhere = Prisma.sql`WHERE ${Prisma.join(expenseConditions, " AND ")}`;

    type RawExpenseRow = {
      id: string;
      expenseDate: Date;
      amount: number;
      currency: string;
      title: string;
      category: string;
      reference: string | null;
      courseName: string | null;
      sessionTitle: string | null;
    };

    const rawExpenses = await prisma.$queryRaw<RawExpenseRow[]>(Prisma.sql`
      SELECT
        e.id,
        e."expenseDate",
        e.amount::float8 as amount,
        e.currency,
        e.title,
        e.category::text as category,
        e.reference,
        c.name as "courseName",
        cs.title as "sessionTitle"
      FROM "Expense" e
      LEFT JOIN "Course" c ON e."courseId" = c.id
      LEFT JOIN "CourseSession" cs ON e."sessionId" = cs.id
      ${expenseWhere}
      ORDER BY e."expenseDate" DESC
      LIMIT 500
    `);

    expenseCount = rawExpenses.length;
    expenseRows = rawExpenses.map((e) => ({
      kind: "expense" as const,
      id: e.id,
      date: new Date(e.expenseDate),
      amount: Number(e.amount),
      currency: e.currency,
      title: e.title,
      category: e.category,
      categoryLabel:
        EXPENSE_CATEGORY_LABELS[e.category as keyof typeof EXPENSE_CATEGORY_LABELS] ??
        e.category,
      reference: e.reference,
      courseName: e.courseName,
      sessionTitle: e.sessionTitle,
    }));
    expenseTotal = expenseRows.reduce((s, r) => s + r.amount, 0);
  }

  // ── Merge, sort, paginate ─────────────────────────────────────────────────
  const allRows: LedgerRow[] = [...paymentRows, ...expenseRows].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  const total = allRows.length;
  const rows = allRows.slice((page - 1) * pageSize, page * pageSize);

  const primaryCurrency =
    (paymentRows[0]?.currency) ??
    (expenseRows[0]?.currency) ??
    "DZD";

  const summary: LedgerSummary = {
    incomeTotal: paymentIncome,
    expenseTotal,
    netTotal: paymentIncome - expenseTotal,
    currency: primaryCurrency,
    paymentCount: paymentTotal,
    expenseCount,
  };

  return { rows, total, summary };
}

// Legacy aliases so existing imports don't break
export type TransactionRow = LedgerRow;
export type TransactionSummary = LedgerSummary;
export type ListTransactionsInput = ListLedgerInput;
