"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import {
  createPaymentSchema,
  listPaymentsSchema,
  updatePaymentSchema,
  type CreatePaymentInput,
  type ListPaymentsInput,
  type PaymentStatus,
  type UpdatePaymentInput,
} from "@/lib/schemas/payment";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const requireViewPayments = () => requirePermissionAction("payments.view");
const requireWritePayments = () => requirePermissionAction("payments.write");

function serializeAmount(amount: unknown): number {
  if (amount === null || amount === undefined) return 0;
  const n = Number(String(amount));
  return Number.isFinite(n) ? n : 0;
}

function parsePaidAt(v: string, status: PaymentStatus): Date | null {
  if (v.trim() !== "") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // No date given — set to now if it's already paid.
  return status === "COMPLETED" ? new Date() : null;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<Result<{ id: string }>> {
  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requireWritePayments();
  const d = parsed.data;

  // Guard: if a registrationId was passed, verify it belongs to the student.
  if (d.registrationId) {
    const reg = await prisma.registration.findUnique({
      where: { id: d.registrationId },
      select: { studentId: true },
    });
    if (!reg || reg.studentId !== d.studentId) {
      return {
        ok: false,
        error: "That registration doesn't belong to this student.",
      };
    }
  }

  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  try {
    const created = await prisma.payment.create({
      data: {
        studentId: d.studentId,
        registrationId: d.registrationId ?? null,
        amount: d.amount,
        currency: d.currency,
        method: d.method,
        status: d.status,
        reference: emptyToNull(d.reference),
        notes: emptyToNull(d.notes),
        paidAt: parsePaidAt(d.paidAt, d.status),
      },
      select: {
        id: true,
        registration: {
          select: { session: { select: { course: { select: { slug: true } } } } },
        },
      },
    });

    revalidatePath("/payments");
    revalidatePath(`/students/${d.studentId}`);
    const courseSlug =
      created.registration?.session?.course?.slug ?? null;
    if (courseSlug) revalidatePath(`/courses/${courseSlug}`);
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    console.error("createPayment failed", err);
    return {
      ok: false,
      error: "Couldn't record the payment. Please try again.",
    };
  }
}

export async function updatePayment(
  input: UpdatePaymentInput
): Promise<Result<{ id: string }>> {
  const parsed = updatePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requireWritePayments();
  const d = parsed.data;

  const existing = await prisma.payment.findUnique({
    where: { id: d.id },
    select: {
      id: true,
      studentId: true,
      registration: {
        select: { session: { select: { course: { select: { slug: true } } } } },
      },
    },
  });
  if (!existing) return { ok: false, error: "Payment not found." };

  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  try {
    await prisma.payment.update({
      where: { id: d.id },
      data: {
        studentId: d.studentId,
        registrationId: d.registrationId ?? null,
        amount: d.amount,
        currency: d.currency,
        method: d.method,
        status: d.status,
        reference: emptyToNull(d.reference),
        notes: emptyToNull(d.notes),
        paidAt: parsePaidAt(d.paidAt, d.status),
      },
      select: { id: true },
    });

    revalidatePath("/payments");
    revalidatePath(`/students/${d.studentId}`);
    if (existing.studentId !== d.studentId) {
      revalidatePath(`/students/${existing.studentId}`);
    }
    const oldSlug = existing.registration?.session?.course?.slug ?? null;
    if (oldSlug) revalidatePath(`/courses/${oldSlug}`);
    return { ok: true, data: { id: d.id } };
  } catch (err) {
    console.error("updatePayment failed", err);
    return {
      ok: false,
      error: "Couldn't save the payment. Please try again.",
    };
  }
}

export async function setPaymentStatus(
  id: string,
  status: PaymentStatus
): Promise<Result<null>> {
  await requireWritePayments();
  const existing = await prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      registration: {
        select: { session: { select: { course: { select: { slug: true } } } } },
      },
    },
  });
  if (!existing) return { ok: false, error: "Payment not found." };

  await prisma.payment.update({
    where: { id },
    data: {
      status,
      paidAt: status === "COMPLETED" ? new Date() : undefined,
    },
    select: { id: true },
  });

  revalidatePath("/payments");
  revalidatePath(`/students/${existing.studentId}`);
  const slug = existing.registration?.session?.course?.slug ?? null;
  if (slug) revalidatePath(`/courses/${slug}`);
  return { ok: true, data: null };
}

export async function deletePayment(id: string): Promise<Result<null>> {
  await requireWritePayments();
  const existing = await prisma.payment.findUnique({
    where: { id },
    select: {
      studentId: true,
      registration: {
        select: { session: { select: { course: { select: { slug: true } } } } },
      },
    },
  });
  await prisma.payment.delete({ where: { id } });
  revalidatePath("/payments");
  if (existing?.studentId) revalidatePath(`/students/${existing.studentId}`);
  const slug = existing?.registration?.session?.course?.slug ?? null;
  if (slug) revalidatePath(`/courses/${slug}`);
  return { ok: true, data: null };
}

export async function listPayments(input: ListPaymentsInput) {
  const parsed = listPaymentsSchema.parse(input);
  await requireViewPayments();

  const where: Prisma.PaymentWhereInput = {};
  if (parsed.status !== "ALL") where.status = parsed.status;
  if (parsed.method !== "ALL") where.method = parsed.method;
  if (parsed.studentId) where.studentId = parsed.studentId;

  if (parsed.q) {
    const term = parsed.q.trim();
    where.OR = [
      { reference: { contains: term, mode: "insensitive" } },
      { notes: { contains: term, mode: "insensitive" } },
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

  const orderBy: Prisma.PaymentOrderByWithRelationInput = {
    [parsed.sortBy]: parsed.sortDir,
  };

  const [rowsRaw, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy,
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      include: {
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
            id: true,
            session: {
              select: {
                id: true,
                title: true,
                startDate: true,
                course: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  const rows = rowsRaw.map((p) => ({
    ...p,
    amount: serializeAmount(p.amount),
  }));

  return { rows, total, page: parsed.page, pageSize: parsed.pageSize };
}

export type PaymentRow = Awaited<ReturnType<typeof listPayments>>["rows"][number];

// Cheap picker for the payment form's student dropdown.
export async function listStudentsForPaymentPicker() {
  await requireViewPayments();
  return prisma.student.findMany({
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 500,
  });
}

export type PaymentStudentPickerItem = Awaited<
  ReturnType<typeof listStudentsForPaymentPicker>
>[number];

// Registrations for a student — used to attach a payment to a specific session.
export async function listRegistrationsForStudentPicker(studentId: string) {
  await requireViewPayments();
  const rows = await prisma.registration.findMany({
    where: { studentId },
    orderBy: { registeredAt: "desc" },
    select: {
      id: true,
      status: true,
      session: {
        select: {
          id: true,
          title: true,
          startDate: true,
          course: { select: { name: true } },
        },
      },
    },
  });
  return rows;
}

export type PaymentRegistrationPickerItem = Awaited<
  ReturnType<typeof listRegistrationsForStudentPicker>
>[number];

// Payments for a specific student — used by student workspace Payments tab.
export async function getPaymentsForStudent(studentId: string) {
  await requireViewPayments();
  const rows = await prisma.payment.findMany({
    where: { studentId },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    include: {
      registration: {
        select: {
          id: true,
          session: {
            select: {
              id: true,
              title: true,
              startDate: true,
              course: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      },
    },
  });
  return rows.map((p) => ({ ...p, amount: serializeAmount(p.amount) }));
}

export type StudentPaymentRow = Awaited<
  ReturnType<typeof getPaymentsForStudent>
>[number];

// Payments for a course (via registrations → sessions → course).
export async function getPaymentsForCourse(courseId: string) {
  await requireViewPayments();
  const rows = await prisma.payment.findMany({
    where: {
      registration: { session: { courseId } },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
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
          id: true,
          session: {
            select: { id: true, title: true, startDate: true },
          },
        },
      },
    },
  });
  return rows.map((p) => ({ ...p, amount: serializeAmount(p.amount) }));
}

export type CoursePaymentRow = Awaited<
  ReturnType<typeof getPaymentsForCourse>
>[number];
