"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { recordActivity } from "@/lib/activity";
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  type CreateExpenseInput,
  type UpdateExpenseInput,
  type ListExpensesInput,
} from "@/lib/schemas/expense";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const requireView = () => requirePermissionAction("finance.view");
const requireWrite = () => requirePermissionAction("finance.write");

function serializeDecimal(v: unknown): number {
  const n = Number(String(v));
  return Number.isFinite(n) ? n : 0;
}

function emptyToNull(v: string | undefined): string | null {
  if (!v || v.trim() === "") return null;
  return v.trim();
}

// ── Raw row type (returned from $queryRaw) ──────────────────────────────────

export type ExpenseRow = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  category: string;
  expenseDate: Date;
  paymentMethod: string;
  courseId: string | null;
  sessionId: string | null;
  reference: string | null;
  notes: string | null;
  status: string;
  recordedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  recordedByName: string | null;
  courseName: string | null;
  sessionTitle: string | null;
};

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createExpense(
  input: CreateExpenseInput
): Promise<Result<{ id: string }>> {
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const session = await requireWrite();
  const d = parsed.data;

  const id = crypto.randomUUID();
  const now = new Date();

  try {
    await prisma.$executeRaw`
      INSERT INTO "Expense" (
        id, title, description, amount, currency, category,
        "expenseDate", "paymentMethod", "courseId", "sessionId",
        reference, notes, status, "recordedById", "createdAt", "updatedAt"
      ) VALUES (
        ${id},
        ${d.title},
        ${emptyToNull(d.description)},
        ${d.amount}::numeric,
        ${d.currency},
        ${d.category}::"ExpenseCategory",
        ${d.expenseDate}::date,
        ${d.paymentMethod}::"PaymentMethod",
        ${d.courseId ?? null},
        ${d.sessionId ?? null},
        ${emptyToNull(d.reference)},
        ${emptyToNull(d.notes)},
        ${d.status}::"ExpenseStatus",
        ${session.user.id},
        ${now},
        ${now}
      )
    `;

    void recordActivity({
      type: "record.created",
      entity: "Student",
      entityId: session.user.id,
      userId: session.user.id,
      meta: { expenseId: id, title: d.title, amount: d.amount, category: d.category },
    });

    revalidatePath("/finance/expenses");
    if (d.sessionId) revalidatePath(`/sessions`);

    return { ok: true, data: { id } };
  } catch (err) {
    console.error("createExpense failed", err);
    return { ok: false, error: "Couldn't save the expense. Please try again." };
  }
}

export async function updateExpense(
  input: UpdateExpenseInput
): Promise<Result<{ id: string }>> {
  const parsed = updateExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await requireWrite();
  const d = parsed.data;
  const now = new Date();

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Expense" WHERE id = ${d.id}
  `;
  if (!existing[0]) return { ok: false, error: "Expense not found." };

  try {
    await prisma.$executeRaw`
      UPDATE "Expense" SET
        title = ${d.title},
        description = ${emptyToNull(d.description)},
        amount = ${d.amount}::numeric,
        currency = ${d.currency},
        category = ${d.category}::"ExpenseCategory",
        "expenseDate" = ${d.expenseDate}::date,
        "paymentMethod" = ${d.paymentMethod}::"PaymentMethod",
        "courseId" = ${d.courseId ?? null},
        "sessionId" = ${d.sessionId ?? null},
        reference = ${emptyToNull(d.reference)},
        notes = ${emptyToNull(d.notes)},
        status = ${d.status}::"ExpenseStatus",
        "updatedAt" = ${now}
      WHERE id = ${d.id}
    `;

    revalidatePath("/finance/expenses");
    return { ok: true, data: { id: d.id } };
  } catch (err) {
    console.error("updateExpense failed", err);
    return { ok: false, error: "Couldn't update the expense. Please try again." };
  }
}

export async function deleteExpense(id: string): Promise<Result<null>> {
  await requireWrite();

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Expense" WHERE id = ${id}
  `;
  if (!existing[0]) return { ok: false, error: "Expense not found." };

  try {
    await prisma.$executeRaw`DELETE FROM "Expense" WHERE id = ${id}`;
    revalidatePath("/finance/expenses");
    return { ok: true, data: null };
  } catch (err) {
    console.error("deleteExpense failed", err);
    return { ok: false, error: "Couldn't delete the expense. Please try again." };
  }
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function listExpenses(input: ListExpensesInput) {
  const parsed = listExpensesSchema.parse(input);
  await requireView();

  const conditions: Prisma.Sql[] = [];

  if (parsed.q) {
    const term = `%${parsed.q}%`;
    conditions.push(
      Prisma.sql`(e.title ILIKE ${term} OR e.reference ILIKE ${term} OR e.notes ILIKE ${term})`
    );
  }
  if (parsed.category) {
    conditions.push(
      Prisma.sql`e.category = ${parsed.category}::"ExpenseCategory"`
    );
  }
  if (parsed.status !== "ALL") {
    conditions.push(
      Prisma.sql`e.status = ${parsed.status}::"ExpenseStatus"`
    );
  }
  if (parsed.courseId) {
    conditions.push(Prisma.sql`e."courseId" = ${parsed.courseId}`);
  }
  if (parsed.sessionId) {
    conditions.push(Prisma.sql`e."sessionId" = ${parsed.sessionId}`);
  }
  if (parsed.from) {
    conditions.push(Prisma.sql`e."expenseDate" >= ${parsed.from}::date`);
  }
  if (parsed.to) {
    conditions.push(Prisma.sql`e."expenseDate" <= ${parsed.to}::date`);
  }

  const where =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  const sortCol = {
    expenseDate: '"expenseDate"',
    createdAt: '"createdAt"',
    amount: "amount",
  }[parsed.sortBy];

  const sortDir = parsed.sortDir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const offset = (parsed.page - 1) * parsed.pageSize;

  const [rawRows, countResult] = await Promise.all([
    prisma.$queryRaw<ExpenseRow[]>(Prisma.sql`
      SELECT
        e.id, e.title, e.description, e.amount::float8 as amount, e.currency,
        e.category::text as category, e."expenseDate", e."paymentMethod"::text as "paymentMethod",
        e."courseId", e."sessionId", e.reference, e.notes, e.status::text as status,
        e."recordedById", e."createdAt", e."updatedAt",
        u.name as "recordedByName",
        c.name as "courseName",
        cs.title as "sessionTitle"
      FROM "Expense" e
      LEFT JOIN "User" u ON e."recordedById" = u.id
      LEFT JOIN "Course" c ON e."courseId" = c.id
      LEFT JOIN "CourseSession" cs ON e."sessionId" = cs.id
      ${where}
      ORDER BY e.${Prisma.raw(sortCol)} ${sortDir}
      LIMIT ${parsed.pageSize} OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*) as count FROM "Expense" e ${where}
    `),
  ]);

  const rows = rawRows.map((r) => ({ ...r, amount: serializeDecimal(r.amount) }));
  const total = Number(countResult[0]?.count ?? 0);

  return { rows, total, page: parsed.page, pageSize: parsed.pageSize };
}

// Expense total for a session — used in Course Run financial summary.
export async function getExpenseTotalsForSession(sessionId: string) {
  await requireView();

  const rows = await prisma.$queryRaw<
    Array<{ category: string; total: number }>
  >`
    SELECT category::text as category, SUM(amount)::float8 as total
    FROM "Expense"
    WHERE "sessionId" = ${sessionId}
      AND status != 'CANCELLED'::"ExpenseStatus"
    GROUP BY category
    ORDER BY total DESC
  `;

  const byCategory = Object.fromEntries(
    rows.map((r) => [r.category, serializeDecimal(r.total)])
  );
  const grandTotal = rows.reduce((s, r) => s + serializeDecimal(r.total), 0);

  return { byCategory, grandTotal };
}

// Picker for courses — used in expense sheet.
export async function listCoursesForExpensePicker() {
  await requireView();
  return prisma.course.findMany({
    select: { id: true, name: true, slug: true },
    where: { status: { not: "ARCHIVED" } },
    orderBy: [{ name: "asc" }],
    take: 200,
  });
}

// Picker for course runs under a course — used in expense sheet.
export async function listSessionsForExpensePicker(courseId: string) {
  await requireView();
  return prisma.courseSession.findMany({
    where: { courseId },
    select: { id: true, title: true, startDate: true },
    orderBy: { startDate: "desc" },
    take: 50,
  });
}
