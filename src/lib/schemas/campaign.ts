import { z } from "zod";

// Mirror Prisma's CampaignStatus enum.
export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

const optIsoDate = z
  .string()
  .trim()
  .default("")
  .refine(
    (v) => v === "" || !Number.isNaN(new Date(v).getTime()),
    { message: "Enter a valid date" }
  );

export const createCampaignSchema = z
  .object({
    name: z.string().trim().min(2, "Give the campaign a name").max(160),
    description: z.string().trim().max(4000).default(""),
    source: z.string().trim().max(80).default(""),
    budget: z.coerce
      .number()
      .min(0)
      .max(10_000_000)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    status: z.enum(CAMPAIGN_STATUSES).default("DRAFT"),
    startDate: optIsoDate,
    endDate: optIsoDate,
  })
  .refine(
    (d) =>
      !d.startDate ||
      !d.endDate ||
      new Date(d.endDate).getTime() >= new Date(d.startDate).getTime(),
    { message: "End date must be on or after start date", path: ["endDate"] }
  );
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(4000).default(""),
    source: z.string().trim().max(80).default(""),
    budget: z.coerce
      .number()
      .min(0)
      .max(10_000_000)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    status: z.enum(CAMPAIGN_STATUSES).default("DRAFT"),
    startDate: optIsoDate,
    endDate: optIsoDate,
  })
  .refine(
    (d) =>
      !d.startDate ||
      !d.endDate ||
      new Date(d.endDate).getTime() >= new Date(d.startDate).getTime(),
    { message: "End date must be on or after start date", path: ["endDate"] }
  );
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const listCampaignsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .union([z.enum(CAMPAIGN_STATUSES), z.literal("ALL")])
    .default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
  sortBy: z.enum(["createdAt", "name", "status", "startDate"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
export type ListCampaignsInput = z.infer<typeof listCampaignsSchema>;
