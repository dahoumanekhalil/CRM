import { z } from "zod";
import { blockSchema, themeSchema } from "@/lib/landing-blocks/schemas";

export const LANDING_PAGE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type LandingPageStatus = (typeof LANDING_PAGE_STATUSES)[number];

export const updateLandingPageContentSchema = z.object({
  id: z.string().min(1),
  blocks: z.array(blockSchema).max(40),
  theme: themeSchema,
});
export type UpdateLandingPageContentInput = z.infer<
  typeof updateLandingPageContentSchema
>;

export const createLandingPageSchema = z.object({
  courseId: z.string().min(1, "Pick a course"),
  templateId: z.string().min(1, "Pick a template"),
  title: z.string().trim().min(1, "Give the page a title").max(160).optional(),
});
export type CreateLandingPageInput = z.infer<typeof createLandingPageSchema>;

export const updateLandingPageSettingsSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(1, "Give the page a URL slug")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
  seoTitle: z.string().trim().max(160).default(""),
  seoDescription: z.string().trim().max(300).default(""),
  ogImageUrl: z
    .string()
    .trim()
    .max(500)
    .default("")
    .refine(
      (v) => v === "" || z.string().url().safeParse(v).success,
      { message: "Enter a valid URL" }
    ),
});
export type UpdateLandingPageSettingsInput = z.infer<
  typeof updateLandingPageSettingsSchema
>;

export const listLandingPagesSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .union([z.enum(LANDING_PAGE_STATUSES), z.literal("ALL")])
    .default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
  sortBy: z.enum(["updatedAt", "title", "status"]).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
export type ListLandingPagesInput = z.infer<typeof listLandingPagesSchema>;
