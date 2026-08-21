"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermissionAction } from "@/lib/auth-guards";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/schemas/expense";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "BANK_CHECK",
  "POSTAL_MOBILE",
  "CARD",
  "ONLINE",
  "OTHER",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializePrice(p: unknown): number | null {
  if (p == null) return null;
  const n = Number(String(p));
  return Number.isFinite(n) ? n : null;
}

/** Throws if the registration does not belong to the given session. */
async function assertRegistrationBelongsToSession(
  registrationId: string,
  sessionId: string
) {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { sessionId: true },
  });
  if (!reg) throw new Error("Registration not found");
  if (reg.sessionId !== sessionId)
    throw new Error("Registration does not belong to this session");
  return reg;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getSessionRoster(sessionId: string) {
  await requirePermissionAction("sessions.view");

  const data = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    include: {
      course: { select: { id: true, name: true, slug: true, currency: true } },
      instructor: { select: { firstName: true, lastName: true } },
      registrations: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { registeredAt: "asc" },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              method: true,
              paidAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          attendance: {
            where: { sessionId },
            select: { id: true, status: true, sessionDate: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!data) return null;

  return {
    ...data,
    price: serializePrice(data.price),
    registrations: data.registrations.map((r) => ({
      ...r,
      agreedPrice: serializePrice(r.agreedPrice),
      payments: r.payments.map((p) => ({
        ...p,
        amount: serializePrice(p.amount) ?? 0,
      })),
    })),
  };
}

export type SessionRoster = NonNullable<Awaited<ReturnType<typeof getSessionRoster>>>;
export type RosterRow = SessionRoster["registrations"][number];

// ─── Lead ↔ session assignment ───────────────────────────────────────────────

export async function getLeadsForSession(sessionId: string) {
  await requirePermissionAction("leads.view");
  return prisma.lead.findMany({
    where: { interestedSessionId: sessionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      nextAction: true,
      nextActionDue: true,
      isHighPriority: true,
      source: true,
    },
  });
}

export type SessionLeadRow = Awaited<ReturnType<typeof getLeadsForSession>>[number];

export async function searchLeadsForAssignment(query: string) {
  await requirePermissionAction("leads.view");
  const q = query.trim();
  return prisma.lead.findMany({
    where: {
      interestedSessionId: null, // not yet assigned to any session
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  });
}

export type LeadPickerItem = Awaited<ReturnType<typeof searchLeadsForAssignment>>[number];

export async function assignLeadToSession(
  leadId: string,
  sessionId: string
): Promise<void> {
  await requirePermissionAction("leads.write");

  // Verify the session exists
  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: { id: true, course: { select: { slug: true } } },
  });
  if (!session) throw new Error("Session not found");

  await prisma.lead.update({
    where: { id: leadId },
    data: { interestedSessionId: sessionId },
  });

  revalidatePath(`/courses/${session.course.slug}/sessions/${sessionId}`);
  revalidatePath(`/leads/${leadId}`);
}

export async function unassignLeadFromSession(
  leadId: string,
  sessionId: string
): Promise<void> {
  await requirePermissionAction("leads.write");

  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: { course: { select: { slug: true } } },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { interestedSessionId: null },
  });

  revalidatePath(`/courses/${session?.course.slug}/sessions/${sessionId}`);
  revalidatePath(`/leads/${leadId}`);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function markAttendance(
  registrationId: string,
  sessionId: string,
  attendStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
): Promise<void> {
  const session = await requirePermissionAction("attendance.write");

  // Verify this registration actually belongs to this session (IDOR guard)
  await assertRegistrationBelongsToSession(registrationId, sessionId);

  const sessionData = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: { startDate: true, course: { select: { slug: true } } },
  });
  if (!sessionData) throw new Error("Session not found");

  const sessionDate = new Date(sessionData.startDate);
  sessionDate.setHours(0, 0, 0, 0);

  await prisma.attendance.upsert({
    where: { registrationId_sessionDate: { registrationId, sessionDate } },
    create: {
      registrationId,
      sessionId,
      sessionDate,
      status: attendStatus,
      recordedById: session.user.id,
    },
    update: {
      status: attendStatus,
      recordedById: session.user.id,
      recordedAt: new Date(),
    },
  });

  revalidatePath(`/courses/${sessionData.course.slug}/sessions/${sessionId}`);
}

const addPaymentSchema = z.object({
  registrationId: z.string().min(1),
  sessionId: z.string().min(1),
  amount: z.number().positive("Amount must be greater than zero"),
  method: z.enum(PAYMENT_METHODS),
  currency: z.string().min(1).max(10),
});

export async function addPayment(input: {
  studentId: string; // kept for API compat but derived server-side
  registrationId: string;
  sessionId: string;
  amount: number;
  method: string;
  currency: string;
}): Promise<void> {
  const authSession = await requirePermissionAction("payments.write");

  const parsed = addPaymentSchema.parse(input);

  // Verify ownership + get real studentId from DB (never trust client-supplied studentId)
  const reg = await prisma.registration.findUnique({
    where: { id: parsed.registrationId },
    select: { sessionId: true, studentId: true },
  });
  if (!reg) throw new Error("Registration not found");
  if (reg.sessionId !== parsed.sessionId)
    throw new Error("Registration does not belong to this session");

  const sessionData = await prisma.courseSession.findUnique({
    where: { id: parsed.sessionId },
    select: { course: { select: { slug: true } } },
  });
  if (!sessionData) throw new Error("Session not found");

  await prisma.payment.create({
    data: {
      studentId: reg.studentId, // derived from DB, not from client
      registrationId: parsed.registrationId,
      amount: parsed.amount,
      method: parsed.method,
      status: "COMPLETED",
      currency: parsed.currency,
      paidAt: new Date(),
      recordedById: authSession.user.id,
    },
  });

  revalidatePath(`/courses/${sessionData.course.slug}/sessions/${parsed.sessionId}`);
}

export async function setAgreedPrice(
  registrationId: string,
  sessionId: string,
  price: number
): Promise<void> {
  await requirePermissionAction("payments.write");

  if (!Number.isFinite(price) || price <= 0)
    throw new Error("Price must be a positive number");

  // Verify this registration belongs to this session (IDOR guard)
  await assertRegistrationBelongsToSession(registrationId, sessionId);

  const sessionData = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: { course: { select: { slug: true } } },
  });
  if (!sessionData) throw new Error("Session not found");

  await prisma.registration.update({
    where: { id: registrationId },
    data: { agreedPrice: price },
  });

  revalidatePath(`/courses/${sessionData.course.slug}/sessions/${sessionId}`);
}

export async function markNoShow(
  registrationId: string,
  sessionId: string
): Promise<void> {
  await requirePermissionAction("registrations.write");

  // Verify ownership before mutating (IDOR guard)
  await assertRegistrationBelongsToSession(registrationId, sessionId);

  const sessionData = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: { course: { select: { slug: true } } },
  });
  if (!sessionData) throw new Error("Session not found");

  await prisma.registration.update({
    where: { id: registrationId },
    data: { status: "NO_SHOW" },
  });

  revalidatePath(`/courses/${sessionData.course.slug}/sessions/${sessionId}`);
  revalidatePath("/courses/no-shows");
}

// ─── Financial summary ────────────────────────────────────────────────────────

export type CourseRunFinancials = {
  agreedTotal: number;
  collectedTotal: number;
  outstanding: number;
  expenseTotal: number;
  grossResult: number;
  expensesByCategory: Array<{ category: string; label: string; total: number }>;
  currency: string;
};

export async function getCourseRunFinancials(
  sessionId: string
): Promise<CourseRunFinancials> {
  await requirePermissionAction("finance.view");

  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: {
      course: { select: { currency: true } },
      registrations: {
        where: { status: { not: "CANCELLED" } },
        select: {
          agreedPrice: true,
          payments: {
            where: { status: "COMPLETED" },
            select: { amount: true },
          },
        },
      },
    },
  });

  if (!session) throw new Error("Session not found");

  const currency = session.course.currency || "DZD";

  let agreedTotal = 0;
  let collectedTotal = 0;
  for (const reg of session.registrations) {
    if (reg.agreedPrice != null) agreedTotal += Number(String(reg.agreedPrice));
    for (const p of reg.payments) {
      const n = Number(String(p.amount));
      if (n > 0) collectedTotal += n;
    }
  }
  const outstanding = agreedTotal - collectedTotal;

  const expenseRows = await prisma.$queryRaw<
    Array<{ category: string; total: number }>
  >(Prisma.sql`
    SELECT category::text as category, SUM(amount)::float8 as total
    FROM "Expense"
    WHERE "sessionId" = ${sessionId}
      AND status != 'CANCELLED'::"ExpenseStatus"
    GROUP BY category
    ORDER BY total DESC
  `);

  const expenseTotal = expenseRows.reduce((s, r) => s + Number(r.total), 0);
  const grossResult = collectedTotal - expenseTotal;

  const expensesByCategory = expenseRows.map((r) => ({
    category: r.category,
    label:
      EXPENSE_CATEGORY_LABELS[r.category as keyof typeof EXPENSE_CATEGORY_LABELS] ??
      r.category,
    total: Number(r.total),
  }));

  return {
    agreedTotal,
    collectedTotal,
    outstanding,
    expenseTotal,
    grossResult,
    expensesByCategory,
    currency,
  };
}
