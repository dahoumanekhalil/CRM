import { z } from "zod";
import { PAYMENT_METHODS } from "./payment";

export const EXPENSE_CATEGORIES = [
  "HALL_CLEANING",
  "FOOD_MEALS",
  "TRAINING_MATERIALS",
  "CLASSROOM_PREPARATION",
  "CONSUMABLES",
  "VENUE_COSTS",
  "TRANSPORTATION",
  "INSTRUCTOR_COSTS",
  "MARKETING",
  "UTILITIES",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  HALL_CLEANING: "Hall Cleaning",
  FOOD_MEALS: "Food & Meals",
  TRAINING_MATERIALS: "Training Materials",
  CLASSROOM_PREPARATION: "Classroom Preparation",
  CONSUMABLES: "Consumables",
  VENUE_COSTS: "Venue Costs",
  TRANSPORTATION: "Transportation",
  INSTRUCTOR_COSTS: "Instructor Costs",
  MARKETING: "Marketing",
  UTILITIES: "Utilities",
  OTHER: "Other",
};

export const EXPENSE_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).default(""),
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero").max(10_000_000),
  currency: z.string().default("DZD"),
  category: z.enum(EXPENSE_CATEGORIES),
  expenseDate: z
    .string()
    .refine((v) => v !== "" && !isNaN(new Date(v).getTime()), "Enter a valid date"),
  paymentMethod: z.enum(PAYMENT_METHODS).default("CASH"),
  courseId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  reference: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(2000).default(""),
  status: z.enum(EXPENSE_STATUSES).default("CONFIRMED"),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.extend({
  id: z.string().min(1),
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const listExpensesSchema = z.object({
  q: z.string().trim().max(120).default(""),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  status: z.union([z.enum(EXPENSE_STATUSES), z.literal("ALL")]).default("ALL"),
  courseId: z.string().optional(),
  sessionId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
  sortBy: z.enum(["expenseDate", "createdAt", "amount"]).default("expenseDate"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
export type ListExpensesInput = z.infer<typeof listExpensesSchema>;
