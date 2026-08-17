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
  "BANK_TRANSFER",
  "BANK_CHECK",
  "POSTAL_MOBILE",
  "CARD",
  "ONLINE",
  "OTHER",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Human-readable labels for the payment form UI.
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash at Office",
  BANK_TRANSFER: "Bank Transfer",
  BANK_CHECK: "Bank Check",
  POSTAL_MOBILE: "BaridiMob",
  CARD: "Card",
  ONLINE: "Online",
  OTHER: "Other",
};

// Reference field label per method (shown/hidden in the form).
export const PAYMENT_METHOD_REFERENCE_LABEL: Partial<Record<PaymentMethod, string>> = {
  BANK_TRANSFER: "Transaction Reference",
  BANK_CHECK: "Check Number",
  POSTAL_MOBILE: "Transaction Reference",
};

// Same currency list used by courses.
export const PAYMENT_CURRENCIES = [
  "DZD",
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
    .max(10_000_000),
  currency: z.enum(PAYMENT_CURRENCIES).default("DZD"),
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
