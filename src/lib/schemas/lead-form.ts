import { z } from "zod";

// Payload accepted by POST /api/leads/from-landing. This is a *public*
// endpoint — validation must be strict enough that we can trust anything
// that gets through, and generous enough not to reject real submissions.

const trimmedMax = (max: number) => z.string().trim().max(max);

export const leadFormSubmissionSchema = z.object({
  // Which landing page this came from — used to derive course + campaign +
  // source string server-side. Client must send this; users don't type it.
  landingPageId: z.string().min(1),

  // What the visitor typed.
  name: trimmedMax(160).min(1, "Please enter your name"),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email")
    .max(200)
    .email("Enter a valid email address"),
  phone: trimmedMax(40).default(""),
  message: trimmedMax(2000).default(""),
  subscribed: z.boolean().default(true),

  // Honeypot — this field is hidden from real users (display:none, tabIndex=-1).
  // Bots that auto-fill all inputs will populate it. Server silently discards
  // the submission when non-empty so the bot gets no signal it was blocked.
  hp: z.string().max(200).optional(),

  // Attribution — silently captured from URL params on the visitor's browser.
  // Anything malformed is dropped rather than rejected.
  utmSource: trimmedMax(80).optional(),
  utmMedium: trimmedMax(80).optional(),
  utmCampaign: trimmedMax(80).optional(),
});

export type LeadFormSubmissionInput = z.infer<typeof leadFormSubmissionSchema>;
