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

const emptyToNullDate = z
  .string()
  .trim()
  .default("")
  .refine(
    (v) => v === "" || !Number.isNaN(new Date(v).getTime()),
    { message: "Enter a valid date" }
  );

// Free-form tags — the toolbar treats them as free text.
const tagsArray = z.array(z.string().trim().min(1).max(40)).max(20).default([]);

export const createStudentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().max(80).default(""),
  email: optEmail,
  phone: z.string().trim().max(40).default(""),
  dateOfBirth: emptyToNullDate,
  address: z.string().trim().max(300).default(""),
  notes: z.string().trim().max(4000).default(""),
  tags: tagsArray,
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = createStudentSchema.extend({
  id: z.string().min(1),
});
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export const listStudentsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  tag: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
  sortBy: z.enum(["createdAt", "firstName", "lastName"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
export type ListStudentsInput = z.infer<typeof listStudentsSchema>;
