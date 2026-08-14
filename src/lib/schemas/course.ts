import { z } from "zod";

export const COURSE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "PROFESSIONAL",
] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const COURSE_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "SAR",
  "AED",
  "MAD",
  "EGP",
] as const;

export const createCourseSchema = z.object({
  name: z.string().trim().min(2, "Give the course a name").max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "Only lowercase letters, numbers and hyphens")
    .default(""),
  summary: z.string().trim().max(200).default(""),
  description: z.string().max(4000).default(""),
  category: z.string().trim().max(60).default(""),
  level: z.enum(COURSE_LEVELS).default("BEGINNER"),
  durationHours: z.coerce
    .number()
    .int("Whole hours only")
    .min(1)
    .max(1000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  basePrice: z.coerce
    .number()
    .min(0)
    .max(100_000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  currency: z.enum(COURSE_CURRENCIES).default("USD"),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .default("")
    .refine(
      (v) => v === "" || z.string().url().safeParse(v).success,
      { message: "Enter a valid URL" }
    ),
  status: z.enum(COURSE_STATUSES).default("DRAFT"),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const listCoursesSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .union([z.enum(COURSE_STATUSES), z.literal("ALL")])
    .default("ALL"),
  level: z
    .union([z.enum(COURSE_LEVELS), z.literal("ALL")])
    .default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
  sortBy: z
    .enum(["createdAt", "name", "status", "basePrice"])
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ListCoursesInput = z.infer<typeof listCoursesSchema>;

// Reuse the create-shape for edit, add the id. Slug becomes required (can't
// clear it) but stays constrained to the same character set.
export const updateCourseSchema = createCourseSchema.extend({
  id: z.string().min(1),
  slug: z
    .string()
    .trim()
    .min(1, "URL slug is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
});
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
