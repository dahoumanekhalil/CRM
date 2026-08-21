"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermissionAction } from "@/lib/auth-guards";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeDecimal(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listNoShows() {
  await requirePermissionAction("sessions.view");

  const rows = await prisma.registration.findMany({
    where: { status: "NO_SHOW" },
    orderBy: { registeredAt: "desc" },
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
      session: {
        select: {
          id: true,
          title: true,
          startDate: true,
          city: true,
          country: true,
          course: { select: { id: true, name: true, slug: true } },
        },
      },
      payments: {
        where: { status: "COMPLETED" },
        select: {
          id: true,
          amount: true,
          method: true,
          paidAt: true,
          currency: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return rows.map((r) => ({
    ...r,
    agreedPrice: serializeDecimal(r.agreedPrice),
    payments: r.payments.map((p) => ({
      ...p,
      amount: serializeDecimal(p.amount) ?? 0,
    })),
  }));
}

export type NoShowRow = Awaited<ReturnType<typeof listNoShows>>[number];

export async function listSessionsForPicker() {
  await requirePermissionAction("sessions.view");

  return prisma.courseSession.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: { startDate: "desc" },
    take: 200,
    select: {
      id: true,
      title: true,
      startDate: true,
      course: { select: { name: true } },
    },
  });
}

export type SessionPickerItem = Awaited<ReturnType<typeof listSessionsForPicker>>[number];

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function reassignToSession(
  registrationId: string,
  newSessionId: string
): Promise<void> {
  await requirePermissionAction("registrations.write");

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { status: true, studentId: true },
  });

  if (!reg) throw new Error("Registration not found");
  // Only allow reassigning genuine no-shows
  if (reg.status !== "NO_SHOW")
    throw new Error("Registration is not a no-show");

  const newSession = await prisma.courseSession.findUnique({
    where: { id: newSessionId },
    select: { id: true, course: { select: { slug: true } } },
  });
  if (!newSession) throw new Error("Target session not found");

  // Guard against duplicate registration in the target session
  const existing = await prisma.registration.findUnique({
    where: { studentId_sessionId: { studentId: reg.studentId, sessionId: newSessionId } },
    select: { id: true },
  });
  if (existing) throw new Error("Student is already registered in the target session");

  await prisma.registration.update({
    where: { id: registrationId },
    data: { sessionId: newSessionId, status: "CONFIRMED" },
  });

  revalidatePath("/courses/no-shows");
  revalidatePath(`/courses/${newSession.course.slug}`);
}

export async function refundNoShow(registrationId: string): Promise<void> {
  const authSession = await requirePermissionAction("payments.write");

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      session: { select: { course: { select: { slug: true } } } },
      payments: {
        where: { status: "COMPLETED", amount: { gt: 0 } }, // only positive payments (exclude previous refunds)
        select: { id: true, amount: true, currency: true },
      },
    },
  });

  if (!reg) throw new Error("Registration not found");
  // Only refund genuine no-shows — prevents double-refund if status already CANCELLED
  if (reg.status !== "NO_SHOW")
    throw new Error("Registration is not a no-show");

  const courseSlug = reg.session?.course.slug;

  // Atomic: create all refund payments + cancel registration in one transaction
  await prisma.$transaction([
    ...reg.payments.map((p) =>
      prisma.payment.create({
        data: {
          studentId: reg.studentId,
          registrationId,
          amount: -Number(String(p.amount)),
          method: "OTHER",
          status: "COMPLETED",
          currency: p.currency ?? "DZD",
          paidAt: new Date(),
          recordedById: authSession.user.id,
          notes: "Refund for no-show",
        },
      })
    ),
    prisma.registration.update({
      where: { id: registrationId },
      data: { status: "CANCELLED" },
    }),
  ]);

  revalidatePath("/courses/no-shows");
  if (courseSlug) revalidatePath(`/courses/${courseSlug}`);
}
