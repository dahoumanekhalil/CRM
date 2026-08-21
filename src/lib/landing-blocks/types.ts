// Landing page block system — data-driven, per DESIGN.md §12–13.
// Every block is a plain object; pages store an array of these in JSON.

export type BlockType =
  | "hero"
  | "features"
  | "instructor"
  | "pricing"
  | "faq"
  | "cta"
  | "form"
  | "testimonials"
  | "benefits"
  | "curriculum"
  | "social-proof"
  | "video"
  | "gallery"
  | "carousel"
  | "countdown"
  | "two-column";

export interface HeroProps {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  align?: "start" | "center";
}

export interface FeaturesProps {
  heading?: string;
  subheading?: string;
  items: Array<{
    title: string;
    description?: string;
    // Lucide icon name — validated against registry at render time.
    icon?: string;
  }>;
}

export interface InstructorProps {
  heading?: string;
  name: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  expertise?: string[];
}

export interface PricingProps {
  heading?: string;
  price?: string;
  currency?: string;
  period?: string;
  features: string[];
  ctaLabel?: string;
  ctaHref?: string;
  note?: string;
}

export interface FAQProps {
  heading?: string;
  items: Array<{ question: string; answer: string }>;
}

export interface CTAProps {
  headline: string;
  subheadline?: string;
  ctaLabel: string;
  ctaHref?: string;
}

export interface TestimonialsProps {
  heading?: string;
  subheading?: string;
  items: Array<{
    quote: string;
    name: string;
    role?: string;
    rating?: number;
  }>;
}

export interface BenefitsProps {
  heading?: string;
  subheading?: string;
  items: string[];
  columns?: 1 | 2;
}

export interface CurriculumProps {
  heading?: string;
  subheading?: string;
  modules: Array<{
    title: string;
    duration?: string;
    lessons: string[];
  }>;
}

export interface SocialProofProps {
  heading?: string;
  stats: Array<{
    value: string;
    label: string;
  }>;
  note?: string;
}

export interface VideoProps {
  heading?: string;
  subheading?: string;
  url: string;
  caption?: string;
  aspectRatio?: "16/9" | "4/3" | "1/1";
}

export interface GalleryProps {
  heading?: string;
  subheading?: string;
  images: Array<{ url: string; caption?: string }>;
  columns?: 2 | 3 | 4;
}

export interface CarouselProps {
  heading?: string;
  subheading?: string;
  slides: Array<{
    imageUrl: string;
    title?: string;
    description?: string;
    badge?: string;
  }>;
  autoPlay?: boolean;
}

export interface CountdownProps {
  heading?: string;
  subheading?: string;
  targetDate: string; // ISO date-time string
  ctaLabel?: string;
  ctaHref?: string;
  expiredMessage?: string;
}

export interface TwoColumnProps {
  eyebrow?: string;
  heading?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  imageAlt?: string;
  layout?: "image-right" | "image-left";
}

export interface FormProps {
  heading?: string;
  subheading?: string;
  submitLabel?: string;
  // Which fields to render when no formId is linked (legacy inline mode).
  showPhone?: boolean;
  showMessage?: boolean;
  // Consent checkbox — "Yes, keep me posted about future courses".
  showConsent?: boolean;
  consentLabel?: string;
  // Message shown on successful submit (before the form is replaced).
  successHeading?: string;
  successMessage?: string;
  // Privacy disclosure shown under the submit button.
  privacyNote?: string;
  // Link to a Form from the forms library (stored in block JSON).
  formId?: string;
  // Injected at render time by the server — NOT stored in block JSON.
  formDefinition?: import("@/lib/forms/types").FormDefinition;
}

export type BlockPropsByType = {
  hero: HeroProps;
  features: FeaturesProps;
  instructor: InstructorProps;
  pricing: PricingProps;
  faq: FAQProps;
  cta: CTAProps;
  form: FormProps;
  testimonials: TestimonialsProps;
  benefits: BenefitsProps;
  curriculum: CurriculumProps;
  "social-proof": SocialProofProps;
  video: VideoProps;
  gallery: GalleryProps;
  carousel: CarouselProps;
  countdown: CountdownProps;
  "two-column": TwoColumnProps;
};

export type LandingBlock = {
  [K in BlockType]: {
    id: string;
    type: K;
    props: BlockPropsByType[K];
  };
}[BlockType];

export interface Theme {
  primary?: string; // CSS color
  radius?: "sm" | "md" | "lg" | "xl";
  align?: "start" | "center";
}

export interface LandingPageContent {
  blocks: LandingBlock[];
  theme: Theme;
}
