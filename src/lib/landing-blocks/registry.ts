import {
  BookOpen,
  ListChecks,
  UserRound,
  Tag,
  HelpCircle,
  MousePointerClick,
  MailPlus,
  type LucideIcon,
} from "lucide-react";
import type { BlockType, LandingBlock } from "./types";

interface BlockMeta {
  type: BlockType;
  label: string;
  description: string;
  icon: LucideIcon;
  // Used by the builder's "Add block" list to insert defaults.
  createDefault: (id: string) => LandingBlock;
}

export const BLOCK_REGISTRY: Record<BlockType, BlockMeta> = {
  hero: {
    type: "hero",
    label: "Hero",
    description: "Big headline, subheadline and primary call to action.",
    icon: BookOpen,
    createDefault: (id) => ({
      id,
      type: "hero",
      props: {
        eyebrow: "New program",
        headline: "A course headline that sells the transformation.",
        subheadline: "One or two sentences describing the value.",
        ctaLabel: "Reserve your seat",
        ctaHref: "#pricing",
        align: "center",
      },
    }),
  },
  features: {
    type: "features",
    label: "Features",
    description: "What you will learn — a grid of value points.",
    icon: ListChecks,
    createDefault: (id) => ({
      id,
      type: "features",
      props: {
        heading: "What you'll learn",
        items: [
          { title: "Value 1", description: "Short benefit statement." },
          { title: "Value 2", description: "Short benefit statement." },
          { title: "Value 3", description: "Short benefit statement." },
        ],
      },
    }),
  },
  instructor: {
    type: "instructor",
    label: "Instructor",
    description: "Highlight the instructor with photo, title and bio.",
    icon: UserRound,
    createDefault: (id) => ({
      id,
      type: "instructor",
      props: {
        heading: "Your instructor",
        name: "Instructor Name",
        title: "Founder & Lead Trainer",
        bio: "A short bio that establishes credibility.",
        expertise: ["Strategy", "Leadership", "AI"],
      },
    }),
  },
  pricing: {
    type: "pricing",
    label: "Pricing",
    description: "Price, benefits list, and a big CTA.",
    icon: Tag,
    createDefault: (id) => ({
      id,
      type: "pricing",
      props: {
        heading: "One price. Everything included.",
        price: "1,490",
        currency: "USD",
        period: "per seat",
        features: [
          "Full 3-day program",
          "Certificate of completion",
          "12 months alumni access",
        ],
        ctaLabel: "Reserve your seat",
        ctaHref: "#register",
      },
    }),
  },
  faq: {
    type: "faq",
    label: "FAQ",
    description: "Common questions in a collapsible list.",
    icon: HelpCircle,
    createDefault: (id) => ({
      id,
      type: "faq",
      props: {
        heading: "Frequently asked",
        items: [
          { question: "Who is this course for?", answer: "Anyone who…" },
          { question: "Do I need experience?", answer: "No prior experience required." },
        ],
      },
    }),
  },
  cta: {
    type: "cta",
    label: "CTA",
    description: "Strong closing call to action.",
    icon: MousePointerClick,
    createDefault: (id) => ({
      id,
      type: "cta",
      props: {
        headline: "Ready to level up your team?",
        subheadline: "Join hundreds of professionals already enrolled.",
        ctaLabel: "Reserve your seat",
        ctaHref: "#register",
      },
    }),
  },
  form: {
    type: "form",
    label: "Form",
    description: "Registration form that captures leads into your CRM.",
    icon: MailPlus,
    createDefault: (id) => ({
      id,
      type: "form",
      props: {
        heading: "Reserve your seat",
        subheading:
          "Leave your details and our team will reach out with next steps.",
        submitLabel: "Request info",
        showPhone: true,
        showMessage: true,
        showConsent: true,
        consentLabel:
          "Yes, I'd like to hear about future courses and updates.",
        successHeading: "Thanks — you're on the list.",
        successMessage:
          "Our team will get back to you within one business day.",
        privacyNote:
          "We'll only use your details to contact you about this course.",
      },
    }),
  },
};

export const BLOCK_LIST = Object.values(BLOCK_REGISTRY);
