"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  createInstructorSchema,
  listInstructorsSchema,
  updateInstructorSchema,
  type CreateInstructorInput,
  type ListInstructorsInput,
  type UpdateInstructorInput,
} from "@/lib/schemas/instructor";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session;
}

function emptyToNull(v: string): string | null {
  return v.trim() === "" ? null : v;
}

export async function createInstructor(
  input: CreateInstructorInput
): Promise<Result<{ id: string }>> {
  const parsed = createInstructorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requireSession();
  const d = parsed.data;

  const email = emptyToNull(d.email);
  if (email) {
    const clash = await prisma.instructor.findUnique({
      where: { email },
      select: { id: true },
    });
    if (clash) {
      return { ok: false, error: "An instructor with that email already exists." };
    }
  }

  try {
    const created = await prisma.instructor.create({
      data: {
        firstName: d.firstName,
        lastName: emptyToNull(d.lastName),
        email,
        phone: emptyToNull(d.phone),
        bio: emptyToNull(d.bio),
        avatarUrl: emptyToNull(d.avatarUrl),
        expertise: d.expertise,
        userId: d.userId ?? null,
      },
      select: { id: true },
    });
    revalidatePath("/instructors");
    return { ok: true, data: created };
  } catch (err) {
    console.error("createInstructor failed", err);
    return { ok: false, error: "We couldn't save the instructor. Please try again." };
  }
}

export async function updateInstructor(
  input: UpdateInstructorInput
): Promise<Result<{ id: string }>> {
  const parsed = updateInstructorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requireSession();
  const d = parsed.data;

  const email = emptyToNull(d.email);
  if (email) {
    const clash = await prisma.instructor.findUnique({
      where: { email },
      select: { id: true },
    });
    if (clash && clash.id !== d.id) {
      return { ok: false, error: "Another instructor already uses that email." };
    }
  }

  try {
    await prisma.instructor.update({
      where: { id: d.id },
      data: {
        firstName: d.firstName,
        lastName: emptyToNull(d.lastName),
        email,
        phone: emptyToNull(d.phone),
        bio: emptyToNull(d.bio),
        avatarUrl: emptyToNull(d.avatarUrl),
        expertise: d.expertise,
        userId: d.userId ?? null,
      },
      select: { id: true },
    });
    revalidatePath("/instructors");
    revalidatePath(`/instructors/${d.id}`);
    return { ok: true, data: { id: d.id } };
  } catch (err) {
    console.error("updateInstructor failed", err);
    return { ok: false, error: "We couldn't save the instructor. Please try again." };
  }
}

export async function listInstructors(input: ListInstructorsInput) {
  const parsed = listInstructorsSchema.parse(input);
  await requireSession();

  const where: Prisma.InstructorWhereInput = {};
  if (parsed.q) {
    const term = parsed.q.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.instructor.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      include: {
        _count: {
          select: { courses: true, sessions: true },
        },
      },
    }),
    prisma.instructor.count({ where }),
  ]);

  return { rows, total, page: parsed.page, pageSize: parsed.pageSize };
}

export type InstructorRow = Awaited<
  ReturnType<typeof listInstructors>
>["rows"][number];

export async function getInstructorDetail(id: string) {
  await requireSession();
  const instructor = await prisma.instructor.findUnique({
    where: { id },
    include: {
      _count: {
        select: { courses: true, sessions: true },
      },
      courses: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          _count: { select: { sessions: true } },
        },
        orderBy: { name: "asc" },
      },
      sessions: {
        select: {
          id: true,
          title: true,
          startDate: true,
          status: true,
          course: { select: { name: true } },
        },
        orderBy: { startDate: "desc" },
        take: 20,
      },
    },
  });
  if (!instructor) return null;
  return instructor;
}

export type InstructorDetail = NonNullable<
  Awaited<ReturnType<typeof getInstructorDetail>>
>;

export async function listUsersForInstructorPicker() {
  await requireSession();
  return prisma.user.findMany({
    where: { instructor: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
