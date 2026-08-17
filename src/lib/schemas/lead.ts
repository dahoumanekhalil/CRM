import { z } from "zod";

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "CONFIRMED",
  "REGISTERED",
  "LOST",
  "NOT_INTERESTED",
  "UNREACHABLE",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Fields the form control renders — always strings for input compatibility.
// Empty strings are coerced to null server-side before writing to Prisma.
export const createLeadSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().max(80).default(""),
  email: z
    .string()
    .trim()
    .max(200)
    .default("")
    .refine(
      (v) => v === "" || z.string().email().safeParse(v).success,
      { message: "Enter a valid email" }
    ),
  phone: z.string().trim().max(40).default(""),
  preferredCallTime: z.string().trim().max(100).default(""),
  status: z.enum(LEAD_STATUSES).default("NEW"),
  source: z.string().trim().max(80).default(""),
  notes: z.string().max(2000).default(""),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.extend({
  id: z.string().min(1),
  subscribed: z.boolean().default(true),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const LEAD_FOLLOW_UP_FILTERS = [
  "ALL",
  "needs-followup",
  "overdue",
  "due-today",
] as const;

export type LeadFollowUpFilter = (typeof LEAD_FOLLOW_UP_FILTERS)[number];

export const LEAD_OWNERSHIP_FILTERS = ["all", "mine", "unassigned"] as const;
export type LeadOwnershipFilter = (typeof LEAD_OWNERSHIP_FILTERS)[number];

export const listLeadsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .union([z.enum(LEAD_STATUSES), z.literal("ALL")])
    .default("ALL"),
  courseId: z.string().min(1).optional(),
  followUp: z.enum(LEAD_FOLLOW_UP_FILTERS).default("ALL"),
  ownership: z.enum(LEAD_OWNERSHIP_FILTERS).default("all"),
  highPriority: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
  sortBy: z
    .enum(["createdAt", "firstName", "status"])
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ListLeadsInput = z.infer<typeof listLeadsSchema>;
