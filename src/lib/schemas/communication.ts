import { z } from "zod";

export const COMMUNICATION_TYPES = [
  "CALL",
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "MEETING",
  "NOTE",
] as const;
export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

export const COMMUNICATION_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;
export type CommunicationDirection = (typeof COMMUNICATION_DIRECTIONS)[number];

export const createCommunicationSchema = z.object({
  type: z.enum(COMMUNICATION_TYPES),
  direction: z.enum(COMMUNICATION_DIRECTIONS).default("OUTBOUND"),
  subject: z.string().trim().max(200).default(""),
  body: z.string().trim().max(10_000).default(""),
  sentAt: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), {
      message: "Enter a valid date",
    }),
  leadId: z.string().optional(),
  studentId: z.string().optional(),
});

export type CreateCommunicationInput = z.infer<typeof createCommunicationSchema>;
