import { z } from "zod";

export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const TASK_ENTITY_TYPES = [
  "Lead",
  "Student",
  "Course",
  "Session",
  "Payment",
  "Campaign",
  "LandingPage",
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskEntityType = (typeof TASK_ENTITY_TYPES)[number];

const nullableStr = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v === "" || v == null ? null : v));

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: nullableStr.pipe(z.string().max(5000).nullable().optional()),
  ownerId: nullableStr,
  priority: z.enum(TASK_PRIORITIES).default("NORMAL"),
  status: z.enum(TASK_STATUSES).default("TODO"),
  dueDate: z.string().optional().nullable().transform((v) => {
    if (!v || v.trim() === "") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }),
  entityType: nullableStr.pipe(z.string().max(50).nullable().optional()),
  entityId: nullableStr.pipe(z.string().max(100).nullable().optional()),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type CreateTaskOutput = z.output<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Title is required").max(500).optional(),
  description: nullableStr.pipe(z.string().max(5000).nullable().optional()),
  ownerId: nullableStr,
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: z.string().optional().nullable().transform((v) => {
    if (!v || v.trim() === "") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }),
});

export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type UpdateTaskOutput = z.output<typeof updateTaskSchema>;

export const listTasksSchema = z.object({
  q: z.string().optional(),
  preset: z.enum(["all", "mine", "today", "overdue", "no-date"]).default("all"),
  status: z.enum(["ALL", ...TASK_STATUSES]).default("ALL"),
  priority: z.enum(["ALL", ...TASK_PRIORITIES]).default("ALL"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListTasksInput = z.input<typeof listTasksSchema>;
