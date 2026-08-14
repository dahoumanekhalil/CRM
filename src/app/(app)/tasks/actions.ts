"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
  type ListTasksInput,
} from "@/lib/schemas/task";
import type { Prisma } from "@prisma/client";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  dueDate: string | null;
  entityType: string | null;
  entityId: string | null;
  completedAt: string | null;
  createdAt: string;
  owner: { id: string; name: string | null; email: string } | null;
};

export type UserPickerItem = {
  id: string;
  name: string | null;
  email: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────

export async function createTask(
  input: CreateTaskInput
): Promise<Result<{ id: string }>> {
  const session = await requirePermissionAction("tasks.write");

  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  try {
    const task = await prisma.task.create({
      data: {
        title: d.title,
        description: d.description ?? null,
        ownerId: d.ownerId ?? session.user.id,
        priority: d.priority,
        status: d.status,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        entityType: d.entityType ?? null,
        entityId: d.entityId ?? null,
      },
      select: { id: true },
    });

    revalidatePath("/tasks");
    if (d.entityType && d.entityId) {
      revalidatePath(`/${entityRoute(d.entityType)}/${d.entityId}`);
    }
    return { ok: true, data: task };
  } catch (err) {
    console.error("createTask failed", err);
    return { ok: false, error: "We couldn't save the task. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTask(
  input: UpdateTaskInput
): Promise<Result<null>> {
  await requirePermissionAction("tasks.write");

  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  try {
    const existing = await prisma.task.findUnique({
      where: { id: d.id },
      select: { entityType: true, entityId: true },
    });

    let completedAt: Date | null | undefined = undefined;
    if (d.status === "COMPLETED") {
      completedAt = new Date();
    } else if (d.status !== undefined) {
      completedAt = null;
    }

    await prisma.task.update({
      where: { id: d.id },
      data: {
        ...(d.title !== undefined && { title: d.title }),
        ...(d.description !== undefined && { description: d.description ?? null }),
        ...(d.ownerId !== undefined && { ownerId: d.ownerId }),
        ...(d.priority !== undefined && { priority: d.priority }),
        ...(d.status !== undefined && { status: d.status }),
        ...(d.dueDate !== undefined && { dueDate: d.dueDate ? new Date(d.dueDate) : null }),
        ...(completedAt !== undefined && { completedAt }),
      },
    });

    revalidatePath("/tasks");
    if (existing?.entityType && existing.entityId) {
      revalidatePath(`/${entityRoute(existing.entityType)}/${existing.entityId}`);
    }
    return { ok: true, data: null };
  } catch (err) {
    console.error("updateTask failed", err);
    return { ok: false, error: "We couldn't update the task. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete / reopen toggle
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleTaskComplete(
  id: string,
  currentStatus: string
): Promise<Result<null>> {
  await requirePermissionAction("tasks.write");

  const isDone = currentStatus === "COMPLETED";
  try {
    await prisma.task.update({
      where: { id },
      data: {
        status: isDone ? "TODO" : "COMPLETED",
        completedAt: isDone ? null : new Date(),
      },
    });
    revalidatePath("/tasks");
    return { ok: true, data: null };
  } catch (err) {
    console.error("toggleTaskComplete failed", err);
    return { ok: false, error: "We couldn't update the task. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteTask(id: string): Promise<Result<null>> {
  await requirePermissionAction("tasks.write");

  try {
    const existing = await prisma.task.findUnique({
      where: { id },
      select: { entityType: true, entityId: true },
    });

    await prisma.task.delete({ where: { id } });
    revalidatePath("/tasks");
    if (existing?.entityType && existing.entityId) {
      revalidatePath(`/${entityRoute(existing.entityType)}/${existing.entityId}`);
    }
    return { ok: true, data: null };
  } catch (err) {
    console.error("deleteTask failed", err);
    return { ok: false, error: "We couldn't delete the task. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────────────────────

export async function listTasks(
  input: ListTasksInput
): Promise<{ rows: TaskRow[]; total: number }> {
  const session = await requirePermissionAction("tasks.view");
  const parsed = listTasksSchema.parse(input);

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const where: Prisma.TaskWhereInput = {};

  // Scope: non-managers only see their own tasks
  if (!isManager) {
    where.ownerId = session.user.id;
  }

  // Preset filters
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000 - 1);

  if (parsed.preset === "mine") {
    where.ownerId = session.user.id;
  } else if (parsed.preset === "today") {
    where.dueDate = { gte: todayStart, lte: todayEnd };
    where.status = { notIn: ["COMPLETED", "CANCELLED"] };
  } else if (parsed.preset === "overdue") {
    where.dueDate = { lt: todayStart };
    where.status = { notIn: ["COMPLETED", "CANCELLED"] };
  } else if (parsed.preset === "no-date") {
    where.dueDate = null;
    where.status = { notIn: ["COMPLETED", "CANCELLED"] };
  }

  // Status filter (overrides preset's status constraint if both set)
  if (parsed.status !== "ALL") {
    where.status = parsed.status;
  }

  // Priority filter
  if (parsed.priority !== "ALL") {
    where.priority = parsed.priority;
  }

  // Search
  if (parsed.q) {
    where.title = { contains: parsed.q, mode: "insensitive" };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      orderBy: [
        { dueDate: { sort: "asc", nulls: "last" } },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        dueDate: true,
        entityType: true,
        entityId: true,
        completedAt: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      dueDate: r.dueDate?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tasks for a specific entity (used in entity workspace tabs)
// ─────────────────────────────────────────────────────────────────────────────

export async function getTasksForEntity(
  entityType: string,
  entityId: string
): Promise<TaskRow[]> {
  await requirePermissionAction("tasks.view");

  const rows = await prisma.task.findMany({
    where: { entityType, entityId },
    orderBy: [
      { status: "asc" },
      { dueDate: { sort: "asc", nulls: "last" } },
      { priority: "desc" },
    ],
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      status: true,
      dueDate: true,
      entityType: true,
      entityId: true,
      completedAt: true,
      createdAt: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  return rows.map((r) => ({
    ...r,
    dueDate: r.dueDate?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Users picker
// ─────────────────────────────────────────────────────────────────────────────

export async function listUsersForPicker(): Promise<UserPickerItem[]> {
  await requirePermissionAction("tasks.view");

  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function entityRoute(entityType: string): string {
  const map: Record<string, string> = {
    Lead: "leads",
    Student: "students",
    Course: "courses",
    Session: "sessions",
    Payment: "payments",
    Campaign: "campaigns",
    LandingPage: "landing-pages",
  };
  return map[entityType] ?? entityType.toLowerCase();
}
