import { z } from "zod";

export const LEAD_STATUSES = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",  // legacy — kept in enum for DB compat; hidden from UI pickers
  "CONFIRMED",
  "REGISTERED",
  "LOST",
  "NOT_INTERESTED",
  "UNREACHABLE",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Statuses visible in UI pickers and filters — FOLLOW_UP excluded (migrated to INTERESTED + Task)
export const VISIBLE_LEAD_STATUSES = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "INTERESTED",
  "CONFIRMED",
  "REGISTERED",
  "LOST",
  "NOT_INTERESTED",
  "UNREACHABLE",
] as const;

export type VisibleLeadStatus = (typeof VISIBLE_LEAD_STATUSES)[number];

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
  city: z.string().trim().max(80).default(""),
  preferredCallTime: z.string().trim().max(100).default(""),
  status: z.enum(VISIBLE_LEAD_STATUSES).default("NEW"),
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

// Call-time presets. "ALL" disables the filter; the others do a
// case-insensitive `contains` match against `preferredCallTime`. This lets
// leads with free-form values like "morning, after 9" still show up under the
// "Morning" preset while giving employees a clean quick-pick UI.
export const LEAD_CALL_TIME_FILTERS = [
  "ALL",
  "morning",
  "afternoon",
  "evening",
  "anytime",
] as const;
export type LeadCallTimeFilter = (typeof LEAD_CALL_TIME_FILTERS)[number];

// Substrings we match `preferredCallTime` against for each preset. Kept
// generous — free-text answers vary wildly ("morning", "AM", "before noon"…).
export const LEAD_CALL_TIME_MATCHERS: Record<Exclude<LeadCallTimeFilter, "ALL">, string[]> = {
  morning: ["morning", "am", "صباح"],
  afternoon: ["afternoon", "midday", "noon", "ظهر"],
  evening: ["evening", "night", "pm", "مساء"],
  anytime: ["anytime", "any time", "any", "flexible", "أي وقت"],
};

export const listLeadsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .union([z.enum(LEAD_STATUSES), z.literal("ALL")])
    .default("ALL"),
  courseId: z.string().min(1).optional(),
  followUp: z.enum(LEAD_FOLLOW_UP_FILTERS).default("ALL"),
  ownership: z.enum(LEAD_OWNERSHIP_FILTERS).default("all"),
  highPriority: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
  // Free-text city filter — case-insensitive `contains` match server-side so
  // "algiers" also matches records saved as "Algiers, Algeria".
  city: z.string().trim().max(80).optional(),
  callTime: z.enum(LEAD_CALL_TIME_FILTERS).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(500).default(25),
  sortBy: z
    .enum([
      "createdAt",
      "firstName",
      "status",
      "email",
      "phone",
      "city",
      "callTime",
    ])
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ListLeadsInput = z.infer<typeof listLeadsSchema>;
