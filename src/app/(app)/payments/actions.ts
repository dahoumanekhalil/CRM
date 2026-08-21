"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { NotificationService } from "@/lib/notifications/notification-service";
import { NotificationTypes } from "@/lib/notifications/types";
import { recordActivity } from "@/lib/activity";
import {
  createPaymentSchema,
  listPaymentsSchema,
  updatePaymentSchema,
  type CreatePaymentInput,
  type ListPaymentsInput,
  type PaymentMethod,
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
  const session = await requireWritePayments();
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
        recordedById: session.user.id,
      },
      select: {
        id: true,
        registration: {
          select: { session: { select: { course: { select: { slug: true } } } } },
        },
      },
    });

    // Fire payment notifications — never blocks the business transaction.
    void (async () => {
      // Fetch context for rich notification messages.
      const [student, registration, recorder] = await Promise.all([
        prisma.student.findUnique({
          where: { id: d.studentId },
          select: {
            firstName: true,
            lastName: true,
            leads: {
              select: { ownerId: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        }),
        d.registrationId
          ? prisma.registration.findUnique({
              where: { id: d.registrationId },
              select: {
                salesOwnerId: true,
                agreedPrice: true,
                session: {
                  select: {
                    startDate: true,
                    price: true,
                    course: { select: { name: true } },
                  },
                },
                payments: {
                  where: { status: "COMPLETED" },
                  select: { amount: true },
                },
              },
            })
          : null,
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true },
        }),
      ]);

      const studentName = [student?.firstName, student?.lastName].filter(Boolean).join(" ") || "Student";
      const salesOwnerId = registration?.salesOwnerId ?? student?.leads[0]?.ownerId ?? null;
      const courseName = registration?.session?.course?.name ?? "—";
      const sessionDate = registration?.session?.startDate
        ? format(registration.session.startDate, "MMM d, yyyy")
        : "—";
      const salesRepName = recorder?.name ?? session.user.email ?? "—";
      const amountStr = Number(d.amount).toLocaleString();
      const managers = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "MANAGER", "FINANCE"] } },
        select: { id: true },
      });

      if (d.status === "PENDING") {
        // Payment needs confirmation — notify Finance/Admin/Manager.
        for (const u of managers) {
          NotificationService.send({
            recipientId: u.id,
            type: NotificationTypes.PAYMENT_PENDING,
            priority: "HIGH",
            payload: {
              category: "ACTION_REQUIRED",
              title: "Payment awaiting confirmation",
              body: `${studentName} — ${amountStr} ${d.currency}`,
              studentName,
              amount: amountStr,
              currency: d.currency,
              method: d.method,
            },
            entityType: "Payment",
            entityId: created.id,
          });
        }
      }

      if (d.status === "COMPLETED") {
        // Rich payment.recorded notification to Sales owner and Managers.
        const allRecipients = new Set([
          ...managers.map((m) => m.id),
          ...(salesOwnerId ? [salesOwnerId] : []),
        ]);
        for (const recipientId of allRecipients) {
          if (recipientId === session.user.id) continue; // don't notify the person who just entered it
          NotificationService.send({
            recipientId,
            type: NotificationTypes.PAYMENT_RECORDED,
            priority: "NORMAL",
            payload: {
              title: "Payment recorded",
              body: `${studentName} — ${amountStr} ${d.currency}`,
              studentName,
              amount: amountStr,
              currency: d.currency,
              method: d.method,
              courseName,
              sessionDate,
              salesRepName,
            },
            entityType: "Payment",
            entityId: created.id,
          });
        }

        // Check if balance is now cleared (totalPaid >= agreedPrice).
        if (registration) {
          const agreedPrice = registration.agreedPrice
            ? Number(String(registration.agreedPrice))
            : registration.session?.price
              ? Number(String(registration.session.price))
              : 0;
          const prevPaid = registration.payments.reduce(
            (sum, p) => sum + Number(String(p.amount)),
            0,
          );
          const newTotal = prevPaid + Number(d.amount);
          if (agreedPrice > 0 && newTotal >= agreedPrice && d.registrationId) {
            const totalStr = newTotal.toLocaleString();
            const clearRecipients = new Set([
              ...managers.map((m) => m.id),
              ...(salesOwnerId ? [salesOwnerId] : []),
            ]);
            for (const recipientId of clearRecipients) {
              if (recipientId === session.user.id) continue;
              NotificationService.send({
                recipientId,
                type: NotificationTypes.PAYMENT_BALANCE_CLEARED,
                priority: "NORMAL",
                payload: {
                  title: "Balance cleared",
                  body: `${studentName} — ${totalStr} ${d.currency}`,
                  studentName,
                  studentId: d.studentId,
                  courseName,
                  totalPaid: totalStr,
                  currency: d.currency,
                },
                entityType: "Registration",
                entityId: d.registrationId,
              });
            }
          }
        }
      }
    })();

    void recordActivity({
      type: "payment.recorded",
      entity: "Student",
      entityId: d.studentId,
      userId: session.user.id,
      meta: {
        paymentId: created.id,
        amount: Number(d.amount),
        currency: d.currency,
        method: d.method,
        registrationId: d.registrationId ?? null,
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
  status: PaymentStatus,
  rejectionReason?: string,
): Promise<Result<null>> {
  const authSession = await requireWritePayments();
  const existing = await prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      amount: true,
      currency: true,
      method: true,
      studentId: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          leads: { select: { ownerId: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      registration: {
        select: {
          id: true,
          salesOwnerId: true,
          agreedPrice: true,
          session: {
            select: {
              startDate: true,
              price: true,
              course: { select: { name: true, slug: true } },
            },
          },
          payments: {
            where: { status: "COMPLETED" },
            select: { amount: true },
          },
        },
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

  // Fire payment.confirmed / payment.rejected notifications.
  if (status === "COMPLETED" || status === "FAILED") {
    void (async () => {
      const studentName = [existing.student.firstName, existing.student.lastName].filter(Boolean).join(" ") || "Student";
      const salesOwnerId = existing.registration?.salesOwnerId ?? existing.student.leads[0]?.ownerId ?? null;
      const amountStr = Number(String(existing.amount)).toLocaleString();
      const managers = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "MANAGER", "FINANCE"] } },
        select: { id: true },
      });
      const recipients = new Set([
        ...managers.map((m) => m.id),
        ...(salesOwnerId ? [salesOwnerId] : []),
      ]);

      if (status === "COMPLETED") {
        for (const recipientId of recipients) {
          if (recipientId === authSession.user.id) continue;
          NotificationService.send({
            recipientId,
            type: NotificationTypes.PAYMENT_CONFIRMED,
            priority: "NORMAL",
            entityType: "Payment",
            entityId: id,
            payload: {
              title: "Payment confirmed",
              body: `${studentName} — ${amountStr} ${existing.currency}`,
              studentName,
              amount: amountStr,
              currency: existing.currency,
              method: existing.method,
            },
          });
        }

        // Check for balance cleared after confirmation.
        const reg = existing.registration;
        if (reg) {
          const agreedPrice = reg.agreedPrice
            ? Number(String(reg.agreedPrice))
            : reg.session?.price
              ? Number(String(reg.session.price))
              : 0;
          const prevPaid = reg.payments.reduce((sum, p) => sum + Number(String(p.amount)), 0);
          const newTotal = prevPaid + Number(String(existing.amount));
          const courseName = reg.session?.course?.name ?? "—";

          if (agreedPrice > 0 && newTotal >= agreedPrice) {
            for (const recipientId of recipients) {
              if (recipientId === authSession.user.id) continue;
              NotificationService.send({
                recipientId,
                type: NotificationTypes.PAYMENT_BALANCE_CLEARED,
                priority: "NORMAL",
                entityType: "Registration",
                entityId: reg.id,
                payload: {
                  title: "Balance cleared",
                  body: `${studentName} — full payment confirmed`,
                  studentName,
                  studentId: existing.studentId,
                  courseName,
                  totalPaid: newTotal.toLocaleString(),
                  currency: existing.currency,
                },
              });
            }
          }
        }
      }

      if (status === "FAILED") {
        for (const recipientId of recipients) {
          if (recipientId === authSession.user.id) continue;
          NotificationService.send({
            recipientId,
            type: NotificationTypes.PAYMENT_REJECTED,
            priority: "HIGH",
            entityType: "Payment",
            entityId: id,
            payload: {
              title: "Payment rejected",
              body: `${studentName} — ${amountStr} ${existing.currency}`,
              studentName,
              amount: amountStr,
              currency: existing.currency,
              reason: rejectionReason ?? "Could not be verified",
            },
          });
        }
      }
    })();
  }

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

// Payments scoped to a single session.
export async function getPaymentsForSession(sessionId: string) {
  await requireViewPayments();
  const rows = await prisma.payment.findMany({
    where: { registration: { sessionId } },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 500,
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      registration: {
        select: { id: true, agreedPrice: true },
      },
    },
  });
  return rows.map((p) => ({
    ...p,
    amount: serializeAmount(p.amount),
    registration: p.registration
      ? {
          ...p.registration,
          agreedPrice: p.registration.agreedPrice != null
            ? Number(String(p.registration.agreedPrice))
            : null,
        }
      : null,
  }));
}

export type SessionPaymentRow = Awaited<ReturnType<typeof getPaymentsForSession>>[number];

// Payment summary for a specific registration — shows agreed price, total paid, remaining balance.
export async function getRegistrationPaymentSummary(registrationId: string) {
  await requireViewPayments();

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      agreedPrice: true,
      session: {
        select: { price: true, course: { select: { name: true } } },
      },
      payments: {
        where: { status: "COMPLETED" },
        select: { amount: true },
      },
    },
  });
  if (!reg) return null;

  const agreedPrice =
    reg.agreedPrice != null
      ? serializeAmount(reg.agreedPrice)
      : serializeAmount(reg.session.price);

  const totalPaid = reg.payments.reduce(
    (sum, p) => sum + serializeAmount(p.amount),
    0
  );

  const remaining = Math.max(0, agreedPrice - totalPaid);

  const paymentStatus =
    agreedPrice === 0
      ? ("FULLY_PAID" as const)
      : totalPaid === 0
        ? ("UNPAID" as const)
        : remaining === 0
          ? ("FULLY_PAID" as const)
          : ("PARTIALLY_PAID" as const);

  return {
    registrationId,
    agreedPrice,
    totalPaid,
    remaining,
    paymentStatus,
    courseName: reg.session.course.name,
  };
}

export type RegistrationPaymentSummary = Exclude<
  Awaited<ReturnType<typeof getRegistrationPaymentSummary>>,
  null
>;

// Outstanding balances across all registrations — used by finance/manager views.
export async function getOutstandingBalances(options?: {
  studentId?: string;
  courseId?: string;
  limit?: number;
}) {
  await requireViewPayments();

  const regs = await prisma.registration.findMany({
    where: {
      ...(options?.studentId ? { studentId: options.studentId } : {}),
      ...(options?.courseId
        ? { session: { courseId: options.courseId } }
        : {}),
      status: { in: ["PENDING", "CONFIRMED", "ATTENDING"] },
    },
    take: options?.limit ?? 100,
    orderBy: { registeredAt: "desc" },
    select: {
      id: true,
      studentId: true,
      agreedPrice: true,
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      session: {
        select: {
          price: true,
          title: true,
          course: { select: { id: true, name: true, slug: true } },
        },
      },
      payments: {
        where: { status: "COMPLETED" },
        select: { amount: true },
      },
    },
  });

  return regs
    .map((reg) => {
      const agreedPrice =
        reg.agreedPrice != null
          ? serializeAmount(reg.agreedPrice)
          : serializeAmount(reg.session.price);
      const totalPaid = reg.payments.reduce(
        (sum, p) => sum + serializeAmount(p.amount),
        0
      );
      const remaining = Math.max(0, agreedPrice - totalPaid);
      const paymentStatus =
        agreedPrice === 0
          ? ("FULLY_PAID" as const)
          : totalPaid === 0
            ? ("UNPAID" as const)
            : remaining === 0
              ? ("FULLY_PAID" as const)
              : ("PARTIALLY_PAID" as const);
      return {
        registrationId: reg.id,
        student: reg.student,
        session: reg.session,
        agreedPrice,
        totalPaid,
        remaining,
        paymentStatus,
      };
    })
    .filter((r) => r.paymentStatus !== "FULLY_PAID");
}

export type OutstandingBalanceRow = Awaited<
  ReturnType<typeof getOutstandingBalances>
>[number];

// Batch payment summaries for all registrations of a student — used in registrations tab.
export async function getPaymentSummariesForStudent(studentId: string) {
  await requireViewPayments();

  const regs = await prisma.registration.findMany({
    where: { studentId },
    select: {
      id: true,
      agreedPrice: true,
      session: { select: { price: true } },
      payments: {
        where: { status: "COMPLETED" },
        select: { amount: true },
      },
    },
  });

  return Object.fromEntries(
    regs.map((reg) => {
      const agreedPrice =
        reg.agreedPrice != null
          ? serializeAmount(reg.agreedPrice)
          : serializeAmount(reg.session.price);
      const totalPaid = reg.payments.reduce(
        (sum, p) => sum + serializeAmount(p.amount),
        0
      );
      const remaining = Math.max(0, agreedPrice - totalPaid);
      const paymentStatus =
        agreedPrice === 0
          ? ("FULLY_PAID" as const)
          : totalPaid === 0
            ? ("UNPAID" as const)
            : remaining === 0
              ? ("FULLY_PAID" as const)
              : ("PARTIALLY_PAID" as const);
      return [reg.id, { agreedPrice, totalPaid, remaining, paymentStatus }];
    })
  ) as Record<
    string,
    {
      agreedPrice: number;
      totalPaid: number;
      remaining: number;
      paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "FULLY_PAID";
    }
  >;
}

// Quick payment recorder for the Lead Drawer — avoids the full payment form.
// SALES: restricted to registrations from their own leads.
export async function createPaymentForRegistration(
  registrationId: string,
  input: {
    amount: number;
    method: PaymentMethod;
    reference: string;
    notes: string;
  }
): Promise<Result<RegistrationPaymentSummary>> {
  const authSession = await requireWritePayments();

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { id: true, studentId: true, leadId: true },
  });
  if (!reg) return { ok: false, error: "Registration not found." };

  if (authSession.user.role === "SALES" && reg.leadId) {
    const ownedLead = await prisma.lead.findFirst({
      where: { id: reg.leadId, ownerId: authSession.user.id },
      select: { id: true },
    });
    if (!ownedLead) {
      return { ok: false, error: "You can only record payments for your own leads." };
    }
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }

  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  try {
    const created = await prisma.payment.create({
      data: {
        studentId: reg.studentId,
        registrationId,
        amount: input.amount,
        currency: "DZD",
        method: input.method,
        status: "COMPLETED",
        reference: emptyToNull(input.reference),
        notes: emptyToNull(input.notes),
        paidAt: new Date(),
        recordedById: authSession.user.id,
      },
      select: { id: true },
    });

    void recordActivity({
      type: "payment.recorded",
      entity: "Student",
      entityId: reg.studentId,
      userId: authSession.user.id,
      meta: {
        paymentId: created.id,
        amount: input.amount,
        currency: "DZD",
        method: input.method,
        registrationId,
      },
    });

    revalidatePath("/payments");
    revalidatePath(`/students/${reg.studentId}`);
    if (reg.leadId) revalidatePath(`/leads/${reg.leadId}`);

    const summary = await getRegistrationPaymentSummary(registrationId);
    if (!summary) {
      return { ok: false, error: "Payment recorded but summary unavailable." };
    }
    return { ok: true, data: summary };
  } catch (err) {
    console.error("createPaymentForRegistration failed", err);
    return { ok: false, error: "Couldn't record the payment. Please try again." };
  }
}
