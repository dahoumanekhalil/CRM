"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/string-utils";
import { recordActivity } from "@/lib/activity";
import { requirePermissionAction } from "@/lib/auth-guards";
import {
  createStudentSchema,
  listStudentsSchema,
  updateStudentSchema,
  type CreateStudentInput,
  type ListStudentsInput,
  type UpdateStudentInput,
} from "@/lib/schemas/student";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function emptyToNull(v: string): string | null {
  return v.trim() === "" ? null : v;
}

function parseDob(v: string): Date | null {
  if (v.trim() === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createStudent(
  input: CreateStudentInput
): Promise<Result<{ id: string }>> {
  const parsed = createStudentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requirePermissionAction("students.write");
  const d = parsed.data;

  const email = normalizeEmail(d.email) ?? emptyToNull(d.email);

  if (email) {
    const clash = await prisma.student.findUnique({
      where: { email },
      select: { id: true },
    });
    if (clash) {
      return {
        ok: false,
        error: "A student with that email already exists.",
      };
    }
  }

  try {
    const created = await prisma.student.create({
      data: {
        firstName: d.firstName,
        lastName: emptyToNull(d.lastName),
        email,
        phone: emptyToNull(d.phone),
        dateOfBirth: parseDob(d.dateOfBirth),
        address: emptyToNull(d.address),
        notes: emptyToNull(d.notes),
        tags: d.tags,
      },
      select: { id: true },
    });
    revalidatePath("/students");
    return { ok: true, data: created };
  } catch (err) {
    console.error("createStudent failed", err);
    return {
      ok: false,
      error: "We couldn't save the student. Please try again.",
    };
  }
}

export async function updateStudent(
  input: UpdateStudentInput
): Promise<Result<{ id: string }>> {
  const parsed = updateStudentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requirePermissionAction("students.write");
  const d = parsed.data;

  const email = normalizeEmail(d.email) ?? emptyToNull(d.email);

  if (email) {
    const clash = await prisma.student.findUnique({
      where: { email },
      select: { id: true },
    });
    if (clash && clash.id !== d.id) {
      return {
        ok: false,
        error: "Another student already uses that email.",
      };
    }
  }

  try {
    await prisma.student.update({
      where: { id: d.id },
      data: {
        firstName: d.firstName,
        lastName: emptyToNull(d.lastName),
        email,
        phone: emptyToNull(d.phone),
        dateOfBirth: parseDob(d.dateOfBirth),
        address: emptyToNull(d.address),
        notes: emptyToNull(d.notes),
        tags: d.tags,
      },
      select: { id: true },
    });
    revalidatePath("/students");
    revalidatePath(`/students/${d.id}`);
    return { ok: true, data: { id: d.id } };
  } catch (err) {
    console.error("updateStudent failed", err);
    return {
      ok: false,
      error: "We couldn't save the student. Please try again.",
    };
  }
}

export async function deleteStudent(id: string): Promise<Result<null>> {
  await requirePermissionAction("students.write");
  try {
    await prisma.student.delete({ where: { id } });
    revalidatePath("/students");
    return { ok: true, data: null };
  } catch (err) {
    console.error("deleteStudent failed", err);
    return { ok: false, error: "Couldn't delete student." };
  }
}

export async function updateStudentNotes(
  studentId: string,
  notes: string
): Promise<Result<null>> {
  await requirePermissionAction("students.write");
  const trimmed = notes.trim();
  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { notes: trimmed === "" || trimmed === "<p></p>" ? null : trimmed },
      select: { id: true },
    });
    revalidatePath(`/students/${studentId}`);
    return { ok: true, data: null };
  } catch (err) {
    console.error("updateStudentNotes failed", err);
    return { ok: false, error: "Couldn't save the notes. Please try again." };
  }
}

export async function listStudents(input: ListStudentsInput) {
  const parsed = listStudentsSchema.parse(input);
  await requirePermissionAction("students.view");

  const where: Prisma.StudentWhereInput = {};

  if (parsed.q) {
    const term = parsed.q.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term } },
    ];
  }

  if (parsed.tag) where.tags = { has: parsed.tag };

  if (parsed.paymentStatus === "paying") {
    where.payments = { some: { status: "COMPLETED" } };
  } else if (parsed.paymentStatus === "unpaid") {
    where.registrations = { some: {} };
    where.payments = { none: { status: "COMPLETED" } };
  }

  const orderBy: Prisma.StudentOrderByWithRelationInput = {
    [parsed.sortBy]: parsed.sortDir,
  };

  const [rows, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy,
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      include: {
        _count: {
          select: { registrations: true, payments: true },
        },
        registrations: {
          select: {
            agreedPrice: true,
            payments: {
              where: { status: "COMPLETED" },
              select: { amount: true },
            },
          },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return {
    rows,
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export type StudentRow = Awaited<
  ReturnType<typeof listStudents>
>["rows"][number];

// Detail — the workspace page.
export async function getStudentDetail(id: string) {
  await requirePermissionAction("students.view");
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          registrations: true,
          payments: true,
          communications: true,
        },
      },
      nextActionOwner: { select: { id: true, name: true, email: true } },
    },
  });
  if (!student) return null;
  return student;
}

export type StudentDetail = NonNullable<
  Awaited<ReturnType<typeof getStudentDetail>>
>;

export async function updateStudentNextAction(
  id: string,
  data: {
    nextAction: string;
    nextActionDue: string | null;
    nextActionOwnerId: string | null;
  }
): Promise<Result<null>> {
  const session = await requirePermissionAction("students.write");
  try {
    await prisma.student.update({
      where: { id },
      data: {
        nextAction: data.nextAction.trim(),
        nextActionDue: data.nextActionDue ? new Date(data.nextActionDue) : null,
        nextActionOwnerId: data.nextActionOwnerId || null,
      },
      select: { id: true },
    });
    void recordActivity({
      type: "lead.next_action_set",
      entity: "Student",
      entityId: id,
      userId: session.user.id,
      meta: { action: data.nextAction },
    });

    // Upsert a Task so the follow-up appears in /tasks.
    const existingTask = await prisma.task.findFirst({
      where: {
        entityType: "Student",
        entityId: id,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const taskPayload = {
      title: data.nextAction.trim(),
      dueDate: data.nextActionDue ? new Date(data.nextActionDue) : null,
      ownerId: data.nextActionOwnerId || session.user.id,
    };
    if (existingTask) {
      await prisma.task.update({ where: { id: existingTask.id }, data: taskPayload });
    } else {
      await prisma.task.create({
        data: {
          ...taskPayload,
          status: "TODO",
          priority: "NORMAL",
          entityType: "Student",
          entityId: id,
        },
      });
    }

    revalidatePath(`/students/${id}`);
    revalidatePath("/tasks");
    return { ok: true, data: null };
  } catch (err) {
    console.error("updateStudentNextAction failed", err);
    return { ok: false, error: "Couldn't save. Please try again." };
  }
}

export async function clearStudentNextAction(id: string): Promise<Result<null>> {
  const session = await requirePermissionAction("students.write");
  try {
    await prisma.student.update({
      where: { id },
      data: { nextAction: null, nextActionDue: null, nextActionOwnerId: null },
      select: { id: true },
    });
    void recordActivity({
      type: "lead.next_action_completed",
      entity: "Student",
      entityId: id,
      userId: session.user.id,
    });
    revalidatePath(`/students/${id}`);
    return { ok: true, data: null };
  } catch (err) {
    console.error("clearStudentNextAction failed", err);
    return { ok: false, error: "Couldn't clear. Please try again." };
  }
}

// Cheap picker — used by the register-student dialog in Task 10.
export async function listStudentsForPicker(term: string) {
  await requirePermissionAction("students.view");
  const q = term.trim();
  const where: Prisma.StudentWhereInput =
    q.length < 2
      ? {}
      : {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        };
  return prisma.student.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 8,
  });
}
