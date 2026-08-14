import { z } from "zod";

// Date range for the whole reports page. Defaults to "last 30 days" via the
// page.tsx if nothing is passed. Kept as strings so <input type="date"> and
// nuqs URL state can drive it directly.
export const reportRangeSchema = z.object({
  from: z
    .string()
    .trim()
    .default("")
    .refine(
      (v) => v === "" || !Number.isNaN(new Date(v).getTime()),
      { message: "Invalid start date" }
    ),
  to: z
    .string()
    .trim()
    .default("")
    .refine(
      (v) => v === "" || !Number.isNaN(new Date(v).getTime()),
      { message: "Invalid end date" }
    ),
});
export type ReportRangeInput = z.infer<typeof reportRangeSchema>;
