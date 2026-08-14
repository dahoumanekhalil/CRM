import { z } from "zod";

// Mirror Prisma's RegistrationStatus enum so form ↔ server contracts stay in sync.
export const REGISTRATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "ATTENDING",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const createRegistrationSchema = z.object({
  studentId: z.string().min(1, "Pick a student"),
  sessionId: z.string().min(1, "Pick a session"),
  status: z.enum(REGISTRATION_STATUSES).default("CONFIRMED"),
  source: z.string().trim().max(80).default(""),
  notes: z.string().trim().max(2000).default(""),
});
export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;

export const updateRegistrationStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(REGISTRATION_STATUSES),
});

// Convert a lead → student (and optionally register in one step).
// `sessionId` is optional: if provided, the lead is registered and status = REGISTERED;
// if omitted, the lead is only converted (student created, Lead.studentId set,
// Lead.status = INTERESTED — the "accepted" state before actual booking).
export const convertLeadSchema = z.object({
  leadId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  registrationStatus: z.enum(REGISTRATION_STATUSES).default("CONFIRMED"),
  notes: z.string().trim().max(2000).default(""),
});
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
