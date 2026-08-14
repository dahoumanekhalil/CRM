import { z } from "zod";

const optEmail = z
  .string()
  .trim()
  .max(200)
  .default("")
  .refine(
    (v) => v === "" || z.string().email().safeParse(v).success,
    { message: "Enter a valid email address" }
  );

const expertiseArray = z
  .array(z.string().trim().min(1).max(80))
  .max(30)
  .default([]);

export const createInstructorSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().max(80).default(""),
  email: optEmail,
  phone: z.string().trim().max(40).default(""),
  bio: z.string().trim().max(4000).default(""),
  expertise: expertiseArray,
  avatarUrl: z.string().trim().max(500).default(""),
  userId: z.string().optional(),
});
export type CreateInstructorInput = z.infer<typeof createInstructorSchema>;

export const updateInstructorSchema = createInstructorSchema.extend({
  id: z.string().min(1),
});
export type UpdateInstructorInput = z.infer<typeof updateInstructorSchema>;

export const listInstructorsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(20),
});
export type ListInstructorsInput = z.infer<typeof listInstructorsSchema>;
