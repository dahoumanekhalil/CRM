"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { slugify } from "@/lib/slug";
import {
  createCourseSchema,
  listCoursesSchema,
  updateCourseSchema,
  type CreateCourseInput,
  type ListCoursesInput,
  type UpdateCourseInput,
} from "@/lib/schemas/course";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session;
}

// Ensure the desired slug is unique; suffix -2, -3, … when taken.
async function uniqueSlug(base: string): Promise<string> {
  const cleaned = slugify(base) || "course";
  let candidate = cleaned;
  let n = 2;
  while (
    await prisma.course.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${cleaned}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function createCourse(
  input: CreateCourseInput
): Promise<Result<{ id: string; slug: string }>> {
  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const session = await requireSession();
  const d = parsed.data;
  const slug = await uniqueSlug(d.slug || d.name);
  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  try {
    const created = await prisma.course.create({
      data: {
        name: d.name,
        slug,
        summary: emptyToNull(d.summary),
        description: emptyToNull(d.description),
        category: emptyToNull(d.category),
        level: d.level,
        durationHours: d.durationHours,
        basePrice: d.basePrice,
        currency: d.currency,
        imageUrl: emptyToNull(d.imageUrl),
        status: d.status,
        createdById: session.user.id,
      },
      select: { id: true, slug: true },
    });

    revalidatePath("/courses");
    return { ok: true, data: created };
  } catch (err) {
    console.error("createCourse failed", err);
    return { ok: false, error: "We couldn't save the course. Please try again." };
  }
}

export async function listCourses(input: ListCoursesInput) {
  const parsed = listCoursesSchema.parse(input);
  await requireSession();

  const where: Prisma.CourseWhereInput = {};

  if (parsed.status !== "ALL") where.status = parsed.status;
  if (parsed.level !== "ALL") where.level = parsed.level;

  if (parsed.q) {
    const term = parsed.q.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { summary: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.CourseOrderByWithRelationInput = {
    [parsed.sortBy]: parsed.sortDir,
  };

  const [rows, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy,
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      include: {
        _count: { select: { sessions: true } },
      },
    }),
    prisma.course.count({ where }),
  ]);

  return {
    rows,
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export type CourseRow = Awaited<ReturnType<typeof listCourses>>["rows"][number];

export async function getCourseDetail(slug: string) {
  await requireSession();
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      primaryInstructor: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          sessions: true,
          landingPages: true,
        },
      },
    },
  });
  if (!course) return null;

  const now = new Date();
  const [registrations, activeRegistrations, publishedPage, nextSession, capacityAgg] =
    await Promise.all([
      // All registrations (tab count pill)
      prisma.registration.count({
        where: { session: { courseId: course.id } },
      }),
      // Capacity-counting statuses only (for the seats bar)
      prisma.registration.count({
        where: {
          session: { courseId: course.id },
          status: { in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"] },
        },
      }),
      prisma.landingPage.findFirst({
        where: { courseId: course.id, status: "PUBLISHED" },
        select: { slug: true },
        orderBy: { publishedAt: "desc" },
      }),
      // Nearest upcoming non-cancelled session
      prisma.courseSession.findFirst({
        where: {
          courseId: course.id,
          startDate: { gte: now },
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        },
        orderBy: { startDate: "asc" },
        select: { id: true, startDate: true, title: true, capacity: true },
      }),
      // Total capacity across all non-cancelled sessions
      prisma.courseSession.aggregate({
        where: { courseId: course.id, status: { notIn: ["CANCELLED"] } },
        _sum: { capacity: true },
      }),
    ]);

  const totalCapacity = capacityAgg._sum.capacity ?? 0;

  // Prisma Decimal doesn't serialize across the server→client boundary — flatten
  // to a plain number here so consumers never have to think about it.
  const { basePrice, ...rest } = course;
  const serializedCourse = {
    ...rest,
    basePrice: basePrice === null ? null : Number(basePrice.toString()),
  };

  return {
    course: serializedCourse,
    registrations,
    activeRegistrations,
    publishedPageSlug: publishedPage?.slug ?? null,
    nextSession: nextSession ?? null,
    totalCapacity,
  };
}

export type CourseDetail = NonNullable<Awaited<ReturnType<typeof getCourseDetail>>>;

export async function updateCourse(
  input: UpdateCourseInput
): Promise<Result<{ id: string; slug: string }>> {
  const parsed = updateCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await requireSession();
  const d = parsed.data;
  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  const existing = await prisma.course.findUnique({
    where: { id: d.id },
    select: { id: true, slug: true },
  });
  if (!existing) return { ok: false, error: "Course not found." };

  if (d.slug !== existing.slug) {
    const clash = await prisma.course.findUnique({
      where: { slug: d.slug },
      select: { id: true },
    });
    if (clash && clash.id !== d.id) {
      return { ok: false, error: "That URL is already taken." };
    }
  }

  try {
    const updated = await prisma.course.update({
      where: { id: d.id },
      data: {
        name: d.name,
        slug: d.slug,
        summary: emptyToNull(d.summary),
        description: emptyToNull(d.description),
        category: emptyToNull(d.category),
        level: d.level,
        durationHours: d.durationHours,
        basePrice: d.basePrice,
        currency: d.currency,
        imageUrl: emptyToNull(d.imageUrl),
        status: d.status,
      },
      select: { id: true, slug: true },
    });

    revalidatePath("/courses");
    revalidatePath(`/courses/${existing.slug}`);
    if (updated.slug !== existing.slug) {
      revalidatePath(`/courses/${updated.slug}`);
    }
    return { ok: true, data: updated };
  } catch (err) {
    console.error("updateCourse failed", err);
    return { ok: false, error: "We couldn't save the course. Please try again." };
  }
}

export async function duplicateCourse(
  id: string
): Promise<Result<{ id: string; slug: string }>> {
  await requireSession();
  const src = await prisma.course.findUnique({ where: { id } });
  if (!src) return { ok: false, error: "Course not found." };

  const name = `${src.name} (copy)`;
  const slug = await uniqueSlug(name);

  const created = await prisma.course.create({
    data: {
      name,
      slug,
      summary: src.summary,
      description: src.description,
      category: src.category,
      level: src.level,
      durationHours: src.durationHours,
      basePrice: src.basePrice,
      currency: src.currency,
      imageUrl: src.imageUrl,
      status: "DRAFT",
      primaryInstructorId: src.primaryInstructorId,
      createdById: src.createdById,
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/courses");
  return { ok: true, data: created };
}
