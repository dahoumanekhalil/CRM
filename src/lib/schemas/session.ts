import { z } from "zod";

// Mirror Prisma's SessionStatus enum so form ↔ server contracts stay in sync.
export const SESSION_STATUSES = [
  "DRAFT",
  "UPCOMING",
  "OPEN",
  "FULL",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// Accepts either a Date, an ISO string, or the "YYYY-MM-DDTHH:mm" shape emitted
// by <input type="datetime-local">. `coerce.date()` handles all three.
const dateField = z.coerce.date();

const emptyStrToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.literal(""), schema])
    .transform((v) => (v === "" ? undefined : v));

export const createSessionSchema = z
  .object({
    courseId: z.string().min(1, "Pick a course"),
    instructorId: emptyStrToUndefined(z.string().min(1)).optional(),
    title: z.string().trim().max(160).default(""),
    startDate: dateField,
    endDate: dateField,
    location: z.string().trim().max(200).default(""),
    city: z.string().trim().max(80).default(""),
    country: z.string().trim().max(80).default(""),
    capacity: z.coerce.number().int().min(1).max(1000).default(20),
    price: z.coerce
      .number()
      .min(0)
      .max(100_000)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    status: z.enum(SESSION_STATUSES).default("UPCOMING"),
    notes: z.string().trim().max(4000).default(""),
  })
  .refine((data) => data.endDate.getTime() >= data.startDate.getTime(), {
    message: "End must be after start",
    path: ["endDate"],
  });

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z
  .object({
    id: z.string().min(1),
    courseId: z.string().min(1),
    instructorId: emptyStrToUndefined(z.string().min(1)).optional(),
    title: z.string().trim().max(160).default(""),
    startDate: dateField,
    endDate: dateField,
    location: z.string().trim().max(200).default(""),
    city: z.string().trim().max(80).default(""),
    country: z.string().trim().max(80).default(""),
    capacity: z.coerce.number().int().min(1).max(1000).default(20),
    price: z.coerce
      .number()
      .min(0)
      .max(100_000)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    status: z.enum(SESSION_STATUSES).default("UPCOMING"),
    notes: z.string().trim().max(4000).default(""),
  })
  .refine((data) => data.endDate.getTime() >= data.startDate.getTime(), {
    message: "End must be after start",
    path: ["endDate"],
  });

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export const listSessionsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .union([z.enum(SESSION_STATUSES), z.literal("ALL")])
    .default("ALL"),
  courseId: z.string().min(1).optional(),
  when: z.enum(["ALL", "UPCOMING", "PAST"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
  sortBy: z.enum(["startDate", "createdAt", "status"]).default("startDate"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type ListSessionsInput = z.infer<typeof listSessionsSchema>;
