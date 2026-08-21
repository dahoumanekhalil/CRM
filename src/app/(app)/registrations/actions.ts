"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import {
  createRegistrationSchema,
  updateRegistrationStatusSchema,
  type CreateRegistrationInput,
  type RegistrationStatus,
} from "@/lib/schemas/registration";
import { recordActivity } from "@/lib/activity";
import { NotificationService } from "@/lib/notifications/notification-service";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function serializePrice(price: unknown): number | null {
  if (price === null || price === undefined) return null;
  const n = Number(String(price));
  return Number.isFinite(n) ? n : null;
}

// Statuses that count against session capacity — cancelled / no-show don't.
const CAPACITY_STATUSES: RegistrationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ATTENDING",
  "COMPLETED",
];

async function assertCapacity(
  sessionId: string,
  excludingRegistrationId?: string
): Promise<Result<null>> {
  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: { capacity: true },
  });
  if (!session) return { ok: false, error: "Session not found." };

  const taken = await prisma.registration.count({
    where: {
      sessionId,
      status: { in: CAPACITY_STATUSES },
      ...(excludingRegistrationId ? { NOT: { id: excludingRegistrationId } } : {}),
    },
  });
  if (taken >= session.capacity) {
    return {
      ok: false,
      error: `Session is at capacity (${taken}/${session.capacity}). Cancel a registration first.`,
    };
  }
  return { ok: true, data: null };
}

async function bumpSessionStatusIfFull(sessionId: string) {
  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: { capacity: true, status: true },
  });
  if (!session) return;
  const taken = await prisma.registration.count({
    where: { sessionId, status: { in: CAPACITY_STATUSES } },
  });
  if (taken >= session.capacity && session.status !== "FULL") {
    await prisma.courseSession.update({
      where: { id: sessionId },
      data: { status: "FULL" },
    });
  } else if (taken < session.capacity && session.status === "FULL") {
    // Roll back to OPEN if a seat frees up.
    await prisma.courseSession.update({
      where: { id: sessionId },
      data: { status: "OPEN" },
    });
  }
}

export async function createRegistration(
  input: CreateRegistrationInput
): Promise<Result<{ id: string }>> {
  const parsed = createRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const session = await requirePermissionAction("registrations.write");
  const d = parsed.data;

  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  let created: { id: string; session: { title: string | null; course: { id: string; slug: string; name: string } } | null } | null = null;

  try {
    // Serializable transaction prevents concurrent over-registration (TOCTOU fix).
    created = await prisma.$transaction(async (tx) => {
      // Dedupe — one registration per student per session.
      const existing = await tx.registration.findUnique({
        where: { studentId_sessionId: { studentId: d.studentId, sessionId: d.sessionId } },
        select: { id: true },
      });
      if (existing) {
        throw Object.assign(new Error("DUPLICATE"), { code: "DUPLICATE" });
      }

      // Capacity check inside the same transaction — prevents race condition.
      const courseSession = await tx.courseSession.findUnique({
        where: { id: d.sessionId },
        select: { capacity: true },
      });
      if (!courseSession) {
        throw Object.assign(new Error("SESSION_NOT_FOUND"), { code: "SESSION_NOT_FOUND" });
      }
      const taken = await tx.registration.count({
        where: { sessionId: d.sessionId, status: { in: CAPACITY_STATUSES } },
      });
      if (taken >= courseSession.capacity) {
        throw Object.assign(
          new Error(`Course run is at capacity (${taken}/${courseSession.capacity}).`),
          { code: "FULL", taken, capacity: courseSession.capacity }
        );
      }

      return tx.registration.create({
        data: {
          studentId: d.studentId,
          sessionId: d.sessionId,
          status: d.status,
          source: emptyToNull(d.source),
          notes: emptyToNull(d.notes),
          confirmedAt: d.status === "CONFIRMED" ? new Date() : null,
        },
        select: { id: true, session: { select: { title: true, course: { select: { id: true, slug: true, name: true } } } } },
      });
    }, { isolationLevel: "Serializable" });
  } catch (err: unknown) {
    const e = err as { code?: string; taken?: number; capacity?: number; message?: string };
    if (e?.code === "DUPLICATE") {
      return { ok: false, error: "This student is already registered for that course run." };
    }
    if (e?.code === "SESSION_NOT_FOUND") {
      return { ok: false, error: "Course run not found." };
    }
    if (e?.code === "FULL") {
      return { ok: false, error: e.message ?? "Course run is at capacity." };
    }
    // Serialization failure — another transaction committed first; treat as full.
    if ((e as { code?: string })?.code === "P2034") {
      return { ok: false, error: "Course run just filled up. Please try another run." };
    }
    console.error("createRegistration failed", err);
    return { ok: false, error: "Couldn't register the student. Please try again." };
  }

  if (!created) return { ok: false, error: "Couldn't register the student. Please try again." };

  try {
    await bumpSessionStatusIfFull(d.sessionId);

    // Notify managers when a session reaches 90%+ capacity.
    void (async () => {
      const sess = await prisma.courseSession.findUnique({
        where: { id: d.sessionId },
        select: { capacity: true },
      });
      if (!sess || sess.capacity <= 0) return;
      const taken = await prisma.registration.count({
        where: { sessionId: d.sessionId, status: { in: CAPACITY_STATUSES } },
      });
      if (taken / sess.capacity >= 0.9) {
        const recipients = await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "MANAGER"] } },
          select: { id: true },
        });
        const sessionTitle = created.session?.title ?? "A session";
        const courseName = created.session?.course?.name ?? "";
        const pct = Math.round((taken / sess.capacity) * 100);
        for (const u of recipients) {
          NotificationService.send({
            recipientId: u.id,
            type: "session.nearCapacity",
            payload: {
              category: "INFO",
              title: `${sessionTitle} is at ${pct}% capacity`,
              body: courseName
                ? `${courseName} — ${taken}/${sess.capacity} seats filled`
                : `${taken}/${sess.capacity} seats filled`,
              priority: 0,
            },
            entityType: "Course",
            entityId: created.session?.course?.id ?? undefined,
          });
        }
      }
    })();

    void recordActivity({
      type: "registration.created",
      entity: "Student",
      entityId: d.studentId,
      userId: session.user.id,
      meta: {
        registrationId: created.id,
        sessionTitle: created.session?.title ?? null,
        courseName: created.session?.course?.name ?? null,
      },
    });
    if (created.session?.course?.id) {
      void recordActivity({
        type: "registration.created",
        entity: "Course",
        entityId: created.session.course.id,
        userId: session.user.id,
        meta: {
          registrationId: created.id,
          studentId: d.studentId,
          sessionTitle: created.session?.title ?? null,
          courseName: created.session?.course?.name ?? null,
        },
      });
    }

    revalidatePath("/sessions");
    revalidatePath(`/students/${d.studentId}`);
    if (created.session?.course?.slug) {
      revalidatePath(`/courses/${created.session.course.slug}`);
    }
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    console.error("createRegistration failed", err);
    return {
      ok: false,
      error: "Couldn't register the student. Please try again.",
    };
  }
}

export async function setRegistrationStatus(
  id: string,
  status: RegistrationStatus
): Promise<Result<null>> {
  const parsed = updateRegistrationStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requirePermissionAction("registrations.write");

  const existing = await prisma.registration.findUnique({
    where: { id },
    select: {
      id: true,
      sessionId: true,
      studentId: true,
      status: true,
      session: { select: { course: { select: { slug: true } } } },
    },
  });
  if (!existing) return { ok: false, error: "Registration not found." };

  // If moving back INTO a capacity-counting status, re-check capacity.
  const wasCapping = CAPACITY_STATUSES.includes(existing.status);
  const willCap = CAPACITY_STATUSES.includes(status);
  if (!wasCapping && willCap) {
    const cap = await assertCapacity(existing.sessionId, id);
    if (!cap.ok) return cap;
  }

  const patch: Prisma.RegistrationUpdateInput = { status };
  if (status === "CONFIRMED") patch.confirmedAt = new Date();
  if (status === "CANCELLED") patch.cancelledAt = new Date();

  await prisma.registration.update({ where: { id }, data: patch });
  await bumpSessionStatusIfFull(existing.sessionId);

  revalidatePath("/sessions");
  revalidatePath(`/students/${existing.studentId}`);
  if (existing.session?.course?.slug) {
    revalidatePath(`/courses/${existing.session.course.slug}`);
  }
  return { ok: true, data: null };
}

// Registrations for a specific student — used in student workspace tab.
export async function getRegistrationsForStudent(studentId: string) {
  await requirePermissionAction("students.view");
  const rows = await prisma.registration.findMany({
    where: { studentId },
    orderBy: { registeredAt: "desc" },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          city: true,
          country: true,
          location: true,
          capacity: true,
          price: true,
          course: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    ...r,
    session: {
      ...r.session,
      price: serializePrice(r.session.price),
    },
  }));
}

export type StudentRegistrationRow = Awaited<
  ReturnType<typeof getRegistrationsForStudent>
>[number];

// Registrations for all sessions of a course — used in course detail tab.
export async function getRegistrationsForCourse(courseId: string) {
  await requirePermissionAction("courses.view");
  const rows = await prisma.registration.findMany({
    where: { session: { courseId } },
    orderBy: { registeredAt: "desc" },
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
      session: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          city: true,
          price: true,
        },
      },
      payments: {
        where: { status: "COMPLETED" },
        select: { amount: true },
      },
    },
  });

  return rows.map((r) => {
    const agreedPrice =
      r.agreedPrice != null
        ? Number(String(r.agreedPrice))
        : Number(String(r.session.price ?? 0));
    const totalPaid = r.payments.reduce(
      (sum, p) => sum + Number(String(p.amount)),
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
      ...r,
      paymentSummary: { agreedPrice, totalPaid, remaining, paymentStatus },
    };
  });
}

export type CourseRegistrationRow = Awaited<
  ReturnType<typeof getRegistrationsForCourse>
>[number];
