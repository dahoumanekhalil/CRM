import type { LandingBlock, LandingPageContent, Theme } from "./types";

// Minimal Course shape a template needs to hydrate. Kept intentionally narrow so
// templates don't depend on the full Prisma type.
export interface TemplateCourseContext {
  name: string;
  summary?: string | null;
  description?: string | null;
  basePrice?: string | number | null;
  currency?: string | null;
  durationHours?: number | null;
  imageUrl?: string | null;
  category?: string | null;
  level?: string | null;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  accent: string; // gradient preview
  theme: Theme;
  build: (course: TemplateCourseContext) => LandingBlock[];
}

const rid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const priceStr = (course: TemplateCourseContext): string => {
  if (course.basePrice === null || course.basePrice === undefined) return "—";
  const n = Number(course.basePrice);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString();
};

const businessCourse: Template = {
  id: "business-course",
  name: "Business Course",
  description: "Clean, corporate layout. Great for management and finance programs.",
  category: "Business",
  accent: "linear-gradient(135deg, #3730a3, #0369a1)",
  theme: { primary: "oklch(0.44 0.19 275)", radius: "lg", align: "start" },
  build: (course) => [
    {
      id: rid("hero"),
      type: "hero",
      props: {
        eyebrow: course.category ?? "Professional program",
        headline: course.name,
        subheadline:
          course.summary ??
          "A hands-on program designed for professionals ready to level up.",
        ctaLabel: "Reserve your seat",
        ctaHref: "#pricing",
        imageUrl: course.imageUrl ?? undefined,
        align: "start",
      },
    },
    {
      id: rid("features"),
      type: "features",
      props: {
        heading: "What you'll take away",
        items: [
          {
            title: "Practical frameworks",
            description: "Tools you can use the moment you're back at your desk.",
            icon: "Wrench",
          },
          {
            title: "Real-world case studies",
            description: "Learn from live examples relevant to your industry.",
            icon: "Briefcase",
          },
          {
            title: "Peer network",
            description: "Build connections with senior professionals from other companies.",
            icon: "Users",
          },
        ],
      },
    },
    {
      id: rid("instructor"),
      type: "instructor",
      props: {
        heading: "Your instructor",
        name: "Add instructor name",
        title: "Add role or credentials",
        bio: "A short bio establishing the instructor's authority in the subject.",
        expertise: ["Strategy", "Leadership"],
      },
    },
    {
      id: rid("pricing"),
      type: "pricing",
      props: {
        heading: "One price. Everything included.",
        price: priceStr(course),
        currency: course.currency ?? "USD",
        period: "per seat",
        features: [
          course.durationHours
            ? `${course.durationHours} hours of instruction`
            : "Full program access",
          "Course materials and templates",
          "Certificate of completion",
          "12 months alumni access",
        ],
        ctaLabel: "Reserve your seat",
        ctaHref: "#register",
      },
    },
    {
      id: rid("faq"),
      type: "faq",
      props: {
        heading: "Frequently asked",
        items: [
          {
            question: "Who is this course for?",
            answer:
              "Professionals looking to expand their expertise in a structured, hands-on program.",
          },
          {
            question: "Are meals included?",
            answer: "Yes — coffee, tea and a plated lunch each day.",
          },
          {
            question: "Can my company pay?",
            answer: "Absolutely. We can issue a company invoice on request.",
          },
        ],
      },
    },
    {
      id: rid("form"),
      type: "form",
      props: {
        heading: `Register your interest`,
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
    },
    {
      id: rid("cta"),
      type: "cta",
      props: {
        headline: `Ready to join ${course.name}?`,
        subheadline: "Seats are limited to preserve the quality of instruction.",
        ctaLabel: "Reserve your seat",
        ctaHref: "#register",
      },
    },
  ],
};

const aiWorkshop: Template = {
  id: "ai-workshop",
  name: "AI Workshop",
  description: "Bold, modern layout. Designed for AI and technology programs.",
  category: "Technology",
  accent: "linear-gradient(135deg, #7c3aed, #ec4899)",
  theme: { primary: "oklch(0.55 0.24 295)", radius: "xl", align: "center" },
  build: (course) => [
    {
      id: rid("hero"),
      type: "hero",
      props: {
        eyebrow: "AI Program",
        headline: course.name,
        subheadline:
          course.summary ??
          "A hands-on workshop that turns you from AI-curious to AI-capable.",
        ctaLabel: "Save my seat",
        ctaHref: "#pricing",
        imageUrl: course.imageUrl ?? undefined,
        align: "center",
      },
    },
    {
      id: rid("features"),
      type: "features",
      props: {
        heading: "What you'll build",
        subheading: "Every module ends with a working artifact you can take home.",
        items: [
          {
            title: "Prompt patterns",
            description: "The building blocks of every high-quality LLM application.",
            icon: "Sparkles",
          },
          {
            title: "Working prototypes",
            description: "Ship at least three small projects during the workshop.",
            icon: "Rocket",
          },
          {
            title: "Evaluation harness",
            description: "Set up a proper evals workflow to measure model output quality.",
            icon: "BarChart3",
          },
        ],
      },
    },
    {
      id: rid("pricing"),
      type: "pricing",
      props: {
        heading: "Everything you need — one price.",
        price: priceStr(course),
        currency: course.currency ?? "USD",
        period: "per seat",
        features: [
          course.durationHours
            ? `${course.durationHours} hours of workshop`
            : "Full workshop access",
          "All example repositories",
          "Lifetime access to updates",
          "Certificate of completion",
        ],
        ctaLabel: "Save my seat",
        ctaHref: "#register",
      },
    },
    {
      id: rid("faq"),
      type: "faq",
      props: {
        heading: "Common questions",
        items: [
          {
            question: "Do I need programming experience?",
            answer:
              "Basic familiarity with the command line is helpful, but not required for most modules.",
          },
          {
            question: "What do I need to bring?",
            answer:
              "A laptop with your preferred code editor. We provide the rest of the environment.",
          },
        ],
      },
    },
    {
      id: rid("form"),
      type: "form",
      props: {
        heading: "Save your seat",
        subheading:
          "Drop your details — we'll reach out with the next cohort dates and a discounted early-bird link.",
        submitLabel: "Save my seat",
        showPhone: true,
        showMessage: false,
        showConsent: true,
        consentLabel: "Yes, I want the AI course newsletter.",
        successHeading: "You're in.",
        successMessage:
          "We'll email you the schedule and the pre-work in the next 24 hours.",
        privacyNote: "No spam. Unsubscribe with one click.",
      },
    },
    {
      id: rid("cta"),
      type: "cta",
      props: {
        headline: "Book your seat today.",
        subheadline: "Small cohorts, real projects, senior instructors.",
        ctaLabel: "Save my seat",
        ctaHref: "#register",
      },
    },
  ],
};

export const TEMPLATES: Template[] = [businessCourse, aiWorkshop];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function buildFromTemplate(
  templateId: string,
  course: TemplateCourseContext
): LandingPageContent {
  const tpl = getTemplate(templateId);
  if (!tpl) {
    return { blocks: [], theme: {} };
  }
  return { blocks: tpl.build(course), theme: tpl.theme };
}
