import {
  BookOpen,
  ListChecks,
  UserRound,
  Tag,
  HelpCircle,
  MousePointerClick,
  MailPlus,
  Quote,
  CheckSquare,
  BookMarked,
  BarChart2,
  Play,
  Images,
  SlidersHorizontal,
  Timer,
  Columns2,
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
  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    description: "Student reviews and quotes.",
    icon: Quote,
    createDefault: (id) => ({
      id,
      type: "testimonials",
      props: {
        heading: "What our students say",
        items: [
          { quote: "This course completely changed how I approach my work.", name: "Ahmed Al-Rashid", role: "Team Lead", rating: 5 },
          { quote: "Practical, well-structured and immediately applicable.", name: "Sara Mansour", role: "Marketing Manager", rating: 5 },
          { quote: "Worth every dirham. Highly recommended.", name: "Khalid Ibrahim", role: "Business Owner", rating: 5 },
        ],
      },
    }),
  },
  benefits: {
    type: "benefits",
    label: "Benefits",
    description: "What you will learn — a clean checklist.",
    icon: CheckSquare,
    createDefault: (id) => ({
      id,
      type: "benefits",
      props: {
        heading: "What you'll walk away with",
        items: [
          "A proven framework you can apply immediately",
          "Confidence to lead your team through change",
          "Practical tools and templates from the program",
          "Certificate of completion + alumni network access",
        ],
        columns: 2,
      },
    }),
  },
  curriculum: {
    type: "curriculum",
    label: "Curriculum",
    description: "Course modules and lessons outline.",
    icon: BookMarked,
    createDefault: (id) => ({
      id,
      type: "curriculum",
      props: {
        heading: "Course curriculum",
        modules: [
          { title: "Module 1 — Foundations", duration: "3 hours", lessons: ["Introduction and objectives", "Core concepts", "Case study walkthrough"] },
          { title: "Module 2 — Application", duration: "4 hours", lessons: ["Hands-on exercises", "Group workshop", "Real-world scenarios"] },
          { title: "Module 3 — Mastery", duration: "3 hours", lessons: ["Advanced techniques", "Action planning", "Final assessment"] },
        ],
      },
    }),
  },
  "social-proof": {
    type: "social-proof",
    label: "Social Proof",
    description: "Key numbers that build trust.",
    icon: BarChart2,
    createDefault: (id) => ({
      id,
      type: "social-proof",
      props: {
        heading: "Trusted by professionals across the region",
        stats: [
          { value: "2,400+", label: "professionals trained" },
          { value: "98%", label: "satisfaction rate" },
          { value: "120+", label: "companies" },
          { value: "6", label: "countries" },
        ],
        note: "Based on post-training surveys from 2023–2025.",
      },
    }),
  },
  video: {
    type: "video",
    label: "Video",
    description: "Embed a YouTube or Vimeo video.",
    icon: Play,
    createDefault: (id) => ({
      id,
      type: "video",
      props: {
        heading: "See it in action",
        subheading: "Watch a short preview of what you'll experience in the program.",
        url: "",
        aspectRatio: "16/9",
      },
    }),
  },
  gallery: {
    type: "gallery",
    label: "Gallery",
    description: "Image grid with lightbox viewer.",
    icon: Images,
    createDefault: (id) => ({
      id,
      type: "gallery",
      props: {
        heading: "Program highlights",
        images: [
          { url: "", caption: "Session 1" },
          { url: "", caption: "Session 2" },
          { url: "", caption: "Session 3" },
        ],
        columns: 3,
      },
    }),
  },
  carousel: {
    type: "carousel",
    label: "Carousel",
    description: "Sliding image carousel with arrows and dots.",
    icon: SlidersHorizontal,
    createDefault: (id) => ({
      id,
      type: "carousel",
      props: {
        heading: "Inside the program",
        slides: [
          { imageUrl: "", title: "Day 1 — Foundations", description: "Core concepts and frameworks." },
          { imageUrl: "", title: "Day 2 — Application", description: "Hands-on exercises and group work." },
          { imageUrl: "", title: "Day 3 — Mastery", description: "Advanced techniques and action planning." },
        ],
        autoPlay: true,
      },
    }),
  },
  countdown: {
    type: "countdown",
    label: "Countdown",
    description: "Live timer to an enrollment deadline.",
    icon: Timer,
    createDefault: (id) => ({
      id,
      type: "countdown",
      props: {
        heading: "Enrollment closes soon",
        subheading: "Secure your spot before registration ends.",
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        ctaLabel: "Reserve your seat now",
        ctaHref: "#register",
        expiredMessage: "Registration is now closed. Contact us to join the waitlist.",
      },
    }),
  },
  "two-column": {
    type: "two-column",
    label: "Two Column",
    description: "Text and image side by side.",
    icon: Columns2,
    createDefault: (id) => ({
      id,
      type: "two-column",
      props: {
        eyebrow: "Why this program",
        heading: "Built for professionals who want real results.",
        body: "Most courses give you theory. This program is built around practice. You'll work through real scenarios, get expert feedback, and leave with a toolkit you can apply immediately.",
        ctaLabel: "Learn more",
        ctaHref: "#curriculum",
        imageUrl: "",
        layout: "image-right",
      },
    }),
  },
};

export const BLOCK_LIST = Object.values(BLOCK_REGISTRY);
