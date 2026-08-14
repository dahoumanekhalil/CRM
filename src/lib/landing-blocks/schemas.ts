import { z } from "zod";
import type { LandingBlock, Theme } from "./types";

// Optional strings that treat empty as undefined without breaking form controls.
const optStr = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => (v.trim() === "" ? undefined : v))
    .optional();

const heroPropsSchema = z.object({
  eyebrow: optStr(60),
  headline: z.string().min(1).max(160),
  subheadline: optStr(400),
  ctaLabel: optStr(40),
  ctaHref: optStr(500),
  imageUrl: optStr(500),
  align: z.enum(["start", "center"]).optional(),
});

const featuresPropsSchema = z.object({
  heading: optStr(120),
  subheading: optStr(300),
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        description: optStr(300),
        icon: optStr(40),
      })
    )
    .min(1)
    .max(12),
});

const instructorPropsSchema = z.object({
  heading: optStr(120),
  name: z.string().min(1).max(80),
  title: optStr(80),
  bio: optStr(800),
  avatarUrl: optStr(500),
  expertise: z.array(z.string().min(1).max(40)).max(12).optional(),
});

const pricingPropsSchema = z.object({
  heading: optStr(120),
  price: optStr(40),
  currency: optStr(8),
  period: optStr(30),
  features: z.array(z.string().min(1).max(120)).max(20),
  ctaLabel: optStr(40),
  ctaHref: optStr(500),
  note: optStr(200),
});

const faqPropsSchema = z.object({
  heading: optStr(120),
  items: z
    .array(
      z.object({
        question: z.string().min(1).max(200),
        answer: z.string().min(1).max(1000),
      })
    )
    .min(1)
    .max(20),
});

const ctaPropsSchema = z.object({
  headline: z.string().min(1).max(160),
  subheadline: optStr(300),
  ctaLabel: z.string().min(1).max(40),
  ctaHref: optStr(500),
});

const formPropsSchema = z.object({
  heading: optStr(160),
  subheading: optStr(400),
  submitLabel: optStr(40),
  showPhone: z.boolean().optional(),
  showMessage: z.boolean().optional(),
  showConsent: z.boolean().optional(),
  consentLabel: optStr(200),
  successHeading: optStr(160),
  successMessage: optStr(400),
  privacyNote: optStr(300),
});

const testimonialsPropsSchema = z.object({
  heading: optStr(120),
  subheading: optStr(300),
  items: z.array(z.object({
    quote: z.string().min(1).max(800),
    name: z.string().min(1).max(80),
    role: optStr(80),
    rating: z.number().int().min(1).max(5).optional(),
  })).min(1).max(12),
});

const benefitsPropsSchema = z.object({
  heading: optStr(120),
  subheading: optStr(300),
  items: z.array(z.string().min(1).max(200)).min(1).max(20),
  columns: z.union([z.literal(1), z.literal(2)]).optional(),
});

const curriculumPropsSchema = z.object({
  heading: optStr(120),
  subheading: optStr(300),
  modules: z.array(z.object({
    title: z.string().min(1).max(120),
    duration: optStr(30),
    lessons: z.array(z.string().min(1).max(200)).max(20),
  })).min(1).max(20),
});

const socialProofPropsSchema = z.object({
  heading: optStr(120),
  stats: z.array(z.object({
    value: z.string().min(1).max(30),
    label: z.string().min(1).max(60),
  })).min(1).max(8),
  note: optStr(200),
});

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("hero"), props: heroPropsSchema }),
  z.object({ id: z.string(), type: z.literal("features"), props: featuresPropsSchema }),
  z.object({ id: z.string(), type: z.literal("instructor"), props: instructorPropsSchema }),
  z.object({ id: z.string(), type: z.literal("pricing"), props: pricingPropsSchema }),
  z.object({ id: z.string(), type: z.literal("faq"), props: faqPropsSchema }),
  z.object({ id: z.string(), type: z.literal("cta"), props: ctaPropsSchema }),
  z.object({ id: z.string(), type: z.literal("form"), props: formPropsSchema }),
  z.object({ id: z.string(), type: z.literal("testimonials"), props: testimonialsPropsSchema }),
  z.object({ id: z.string(), type: z.literal("benefits"), props: benefitsPropsSchema }),
  z.object({ id: z.string(), type: z.literal("curriculum"), props: curriculumPropsSchema }),
  z.object({ id: z.string(), type: z.literal("social-proof"), props: socialProofPropsSchema }),
]);

export const themeSchema = z.object({
  primary: z.string().max(40).optional(),
  radius: z.enum(["sm", "md", "lg", "xl"]).optional(),
  align: z.enum(["start", "center"]).optional(),
});

export const pageContentSchema = z.object({
  blocks: z.array(blockSchema).default([]),
  theme: themeSchema.default({}),
});

// Runtime helpers — safely parse Prisma JSON columns.
export function parseBlocks(value: unknown): LandingBlock[] {
  const result = z.array(blockSchema).safeParse(value);
  return result.success ? result.data : [];
}

export function parseTheme(value: unknown): Theme {
  const result = themeSchema.safeParse(value);
  return result.success ? result.data : {};
}
