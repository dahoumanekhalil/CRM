"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  createSessionSchema,
  listSessionsSchema,
  updateSessionSchema,
  type CreateSessionInput,
  type ListSessionsInput,
  type SessionStatus,
  type UpdateSessionInput,
} from "@/lib/schemas/session";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session;
}

// Prisma Decimal doesn't cross the server → client boundary; flatten to number
// so components downstream never have to think about it.
function serializePrice(price: unknown): number | null {
  if (price === null || price === undefined) return null;
  const n = Number(String(price));
  return Number.isFinite(n) ? n : null;
}

export async function createSession(
  input: CreateSessionInput
): Promise<Result<{ id: string }>> {
  const parsed = createSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requireSession();
  const d = parsed.data;
  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  const course = await prisma.course.findUnique({
    where: { id: d.courseId },
    select: { id: true, slug: true },
  });
  if (!course) return { ok: false, error: "Course not found." };

  try {
    const created = await prisma.courseSession.create({
      data: {
        courseId: course.id,
        instructorId: d.instructorId ?? null,
        title: emptyToNull(d.title),
        startDate: d.startDate,
        endDate: d.endDate,
        location: emptyToNull(d.location),
        city: emptyToNull(d.city),
        country: emptyToNull(d.country),
        capacity: d.capacity,
        price: d.price ?? null,
        status: d.status,
        notes: emptyToNull(d.notes),
      },
      select: { id: true },
    });

    revalidatePath("/sessions");
    revalidatePath(`/courses/${course.slug}`);
    return { ok: true, data: created };
  } catch (err) {
    console.error("createSession failed", err);
    return {
      ok: false,
      error: "We couldn't save the session. Please try again.",
    };
  }
}

export async function updateSession(
  input: UpdateSessionInput
): Promise<Result<{ id: string }>> {
  const parsed = updateSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requireSession();
  const d = parsed.data;
  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  const existing = await prisma.courseSession.findUnique({
    where: { id: d.id },
    select: { id: true, course: { select: { slug: true } } },
  });
  if (!existing) return { ok: false, error: "Session not found." };

  try {
    const updated = await prisma.courseSession.update({
      where: { id: d.id },
      data: {
        courseId: d.courseId,
        instructorId: d.instructorId ?? null,
        title: emptyToNull(d.title),
        startDate: d.startDate,
        endDate: d.endDate,
        location: emptyToNull(d.location),
        city: emptyToNull(d.city),
        country: emptyToNull(d.country),
        capacity: d.capacity,
        price: d.price ?? null,
        status: d.status,
        notes: emptyToNull(d.notes),
      },
      select: { id: true, course: { select: { slug: true } } },
    });

    revalidatePath("/sessions");
    if (existing.course?.slug) revalidatePath(`/courses/${existing.course.slug}`);
    if (updated.course?.slug && updated.course.slug !== existing.course?.slug) {
      revalidatePath(`/courses/${updated.course.slug}`);
    }
    return { ok: true, data: { id: updated.id } };
  } catch (err) {
    console.error("updateSession failed", err);
    return {
      ok: false,
      error: "We couldn't save the session. Please try again.",
    };
  }
}

export async function setSessionStatus(
  id: string,
  status: SessionStatus
): Promise<Result<{ id: string }>> {
  await requireSession();
  const existing = await prisma.courseSession.findUnique({
    where: { id },
    select: { course: { select: { slug: true } } },
  });
  await prisma.courseSession.update({
    where: { id },
    data: { status },
    select: { id: true },
  });
  revalidatePath("/sessions");
  if (existing?.course?.slug) revalidatePath(`/courses/${existing.course.slug}`);
  return { ok: true, data: { id } };
}

export async function deleteSession(id: string): Promise<Result<null>> {
  await requireSession();
  const existing = await prisma.courseSession.findUnique({
    where: { id },
    select: { course: { select: { slug: true } } },
  });
  await prisma.courseSession.delete({ where: { id } });
  revalidatePath("/sessions");
  if (existing?.course?.slug) revalidatePath(`/courses/${existing.course.slug}`);
  return { ok: true, data: null };
}

// Server-side list used by the /sessions route.
export async function listSessions(input: ListSessionsInput) {
  const parsed = listSessionsSchema.parse(input);
  await requireSession();

  const where: Prisma.CourseSessionWhereInput = {};
  if (parsed.status !== "ALL") where.status = parsed.status;
  if (parsed.courseId) where.courseId = parsed.courseId;

  if (parsed.when === "UPCOMING") {
    where.endDate = { gte: new Date() };
  } else if (parsed.when === "PAST") {
    where.endDate = { lt: new Date() };
  }

  if (parsed.q) {
    const term = parsed.q.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { location: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { country: { contains: term, mode: "insensitive" } },
      { course: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const orderBy: Prisma.CourseSessionOrderByWithRelationInput = {
    [parsed.sortBy]: parsed.sortDir,
  };

  const [rowsRaw, total] = await Promise.all([
    prisma.courseSession.findMany({
      where,
      orderBy,
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      include: {
        course: { select: { id: true, name: true, slug: true } },
        instructor: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { registrations: true } },
      },
    }),
    prisma.courseSession.count({ where }),
  ]);

  const rows = rowsRaw.map((s) => ({
    ...s,
    price: serializePrice(s.price),
  }));

  return { rows, total, page: parsed.page, pageSize: parsed.pageSize };
}

export type SessionRow = Awaited<ReturnType<typeof listSessions>>["rows"][number];

// Used by the course detail page — narrower filter, always sorted by start date.
export async function getSessionsForCourse(courseId: string) {
  await requireSession();
  const rows = await prisma.courseSession.findMany({
    where: { courseId },
    orderBy: { startDate: "asc" },
    include: {
      instructor: {
        select: { id: true, firstName: true, lastName: true },
      },
      _count: { select: { registrations: true } },
    },
  });
  return rows.map((s) => ({ ...s, price: serializePrice(s.price) }));
}

export type CourseSessionRow = Awaited<
  ReturnType<typeof getSessionsForCourse>
>[number];

// Cheap list used to populate filter dropdowns (courses picker in toolbar).
export async function listCoursesForFilter() {
  await requireSession();
  return prisma.course.findMany({
    where: { status: { in: ["PUBLISHED", "DRAFT"] } },
    select: { id: true, name: true, slug: true, status: true },
    orderBy: { name: "asc" },
  });
}

// Cheap list of instructors for the session form.
export async function listInstructorsForFilter() {
  await requireSession();
  return prisma.instructor.findMany({
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

export type InstructorPickerItem = Awaited<
  ReturnType<typeof listInstructorsForFilter>
>[number];

export type CoursePickerItem = Awaited<
  ReturnType<typeof listCoursesForFilter>
>[number];
