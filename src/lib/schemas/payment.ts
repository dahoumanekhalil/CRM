import { z } from "zod";

// Mirror Prisma enums.
export const PAYMENT_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "ONLINE",
  "OTHER",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Same currency list used by courses.
export const PAYMENT_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "SAR",
  "AED",
  "MAD",
  "EGP",
] as const;

const optIsoDate = z
  .string()
  .trim()
  .default("")
  .refine(
    (v) => v === "" || !Number.isNaN(new Date(v).getTime()),
    { message: "Enter a valid date" }
  );

export const createPaymentSchema = z.object({
  studentId: z.string().min(1, "Pick a student"),
  registrationId: z.string().min(1).optional(),
  amount: z.coerce
    .number()
    .min(0.01, "Amount must be greater than zero")
    .max(1_000_000),
  currency: z.enum(PAYMENT_CURRENCIES).default("USD"),
  method: z.enum(PAYMENT_METHODS).default("CASH"),
  status: z.enum(PAYMENT_STATUSES).default("COMPLETED"),
  reference: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(2000).default(""),
  paidAt: optIsoDate,
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = createPaymentSchema.extend({
  id: z.string().min(1),
});
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const listPaymentsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .union([z.enum(PAYMENT_STATUSES), z.literal("ALL")])
    .default("ALL"),
  method: z
    .union([z.enum(PAYMENT_METHODS), z.literal("ALL")])
    .default("ALL"),
  studentId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
  sortBy: z.enum(["createdAt", "paidAt", "amount", "status"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
export type ListPaymentsInput = z.infer<typeof listPaymentsSchema>;
