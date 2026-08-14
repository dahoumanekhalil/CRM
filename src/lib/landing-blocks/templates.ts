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

// ── Marketing Course ─────────────────────────────────────────────────────────
const marketingCourse: Template = {
  id: "marketing-course",
  name: "Marketing Course",
  description: "Bold, conversion-driven layout. Perfect for digital marketing and growth programs.",
  category: "Marketing",
  accent: "linear-gradient(135deg, #be185d, #ea580c)",
  theme: { primary: "oklch(0.65 0.19 0)", radius: "xl", align: "center" },
  build: (course) => [
    {
      id: rid("hero"),
      type: "hero",
      props: {
        eyebrow: course.category ?? "Marketing program",
        headline: course.name,
        subheadline:
          course.summary ??
          "Learn the strategies behind the world's fastest-growing brands — and apply them from day one.",
        ctaLabel: "Claim your seat",
        ctaHref: "#register",
        imageUrl: course.imageUrl ?? undefined,
        align: "center",
      },
    },
    {
      id: rid("social-proof"),
      type: "social-proof",
      props: {
        stats: [
          { value: "200+", label: "Alumni" },
          { value: "93%", label: "Satisfaction rate" },
          { value: "4.9 ★", label: "Average rating" },
          { value: "12+", label: "Industries covered" },
        ],
        note: "Trusted by marketing professionals across the region.",
      },
    },
    {
      id: rid("benefits"),
      type: "benefits",
      props: {
        heading: "What you'll walk away with",
        items: [
          "A proven content and distribution strategy you can launch immediately",
          "Paid and organic channel frameworks that scale",
          "Analytics setup to measure what actually matters",
          "Campaign templates you can reuse across every client",
          "A network of peers from leading regional brands",
          "A portfolio-ready capstone project",
        ],
        columns: 2,
      },
    },
    {
      id: rid("instructor"),
      type: "instructor",
      props: {
        heading: "Learn from an industry practitioner",
        name: "Add instructor name",
        title: "Add role or credentials",
        bio: "A short bio that establishes the instructor's track record in marketing.",
        expertise: ["Growth marketing", "Content strategy", "Paid media"],
      },
    },
    {
      id: rid("testimonials"),
      type: "testimonials",
      props: {
        heading: "What past participants say",
        items: [
          {
            quote: "This course changed how I approach every campaign. I applied the frameworks the following week.",
            name: "Add participant name",
            role: "Marketing Manager",
            rating: 5,
          },
          {
            quote: "Practical, fast-paced, and full of real examples. Best investment I've made in my career.",
            name: "Add participant name",
            role: "Brand Strategist",
            rating: 5,
          },
          {
            quote: "The instructor's depth of experience comes through in every module.",
            name: "Add participant name",
            role: "Growth Lead",
            rating: 5,
          },
        ],
      },
    },
    {
      id: rid("pricing"),
      type: "pricing",
      props: {
        heading: "One investment. Lasting results.",
        price: priceStr(course),
        currency: course.currency ?? "USD",
        period: "per participant",
        features: [
          course.durationHours ? `${course.durationHours} hours of instruction` : "Full program access",
          "Campaign templates and swipe files",
          "Lifetime access to recordings",
          "Certificate of completion",
          "30-day post-course Q&A support",
        ],
        ctaLabel: "Claim your seat",
        ctaHref: "#register",
      },
    },
    {
      id: rid("faq"),
      type: "faq",
      props: {
        heading: "Questions? We've got answers.",
        items: [
          {
            question: "Is this suitable for beginners?",
            answer:
              "Yes — we start from first principles, but we move fast. Basic familiarity with digital channels is helpful.",
          },
          {
            question: "Will I get the slides and materials?",
            answer: "All materials, templates, and recordings are yours to keep.",
          },
          {
            question: "Does my company cover the cost?",
            answer: "Most participants expense this. We can issue an invoice to your company upon request.",
          },
        ],
      },
    },
    {
      id: rid("form"),
      type: "form",
      props: {
        heading: "Claim your seat",
        subheading: "Limited spots. Fill in your details and we'll reach out with the next dates.",
        submitLabel: "Claim my seat",
        showPhone: true,
        showMessage: false,
        showConsent: true,
        consentLabel: "Yes, keep me posted about future marketing programs.",
        successHeading: "You're on the list.",
        successMessage: "We'll be in touch within one business day with the next cohort dates.",
        privacyNote: "No spam. Unsubscribe any time.",
      },
    },
    {
      id: rid("cta"),
      type: "cta",
      props: {
        headline: `Ready to grow? Join ${course.name}.`,
        subheadline: "Spots are limited — don't miss the next cohort.",
        ctaLabel: "Claim your seat",
        ctaHref: "#register",
      },
    },
  ],
};

// ── Technology Course ─────────────────────────────────────────────────────────
const technologyCourse: Template = {
  id: "technology-course",
  name: "Technology Course",
  description: "Structured, detail-rich layout. Ideal for software, data, and engineering programs.",
  category: "Technology",
  accent: "linear-gradient(135deg, #0e7490, #1d4ed8)",
  theme: { primary: "oklch(0.54 0.2 240)", radius: "lg", align: "start" },
  build: (course) => [
    {
      id: rid("hero"),
      type: "hero",
      props: {
        eyebrow: course.category ?? "Technical program",
        headline: course.name,
        subheadline:
          course.summary ??
          "A rigorous, hands-on program taught by practitioners — covering theory and real-world application.",
        ctaLabel: "Enroll now",
        ctaHref: "#pricing",
        imageUrl: course.imageUrl ?? undefined,
        align: "start",
      },
    },
    {
      id: rid("features"),
      type: "features",
      props: {
        heading: "What you'll master",
        items: [
          {
            title: "Core concepts",
            description: "Deep dives into the fundamentals — no hand-waving allowed.",
            icon: "BookOpen",
          },
          {
            title: "Hands-on projects",
            description: "Build real artifacts you can add to your portfolio immediately.",
            icon: "Code",
          },
          {
            title: "Best practices",
            description: "Industry standards, patterns, and anti-patterns from production systems.",
            icon: "Shield",
          },
          {
            title: "Tooling and ecosystem",
            description: "The tools top teams use — set up, configured, and integrated.",
            icon: "Wrench",
          },
        ],
      },
    },
    {
      id: rid("curriculum"),
      type: "curriculum",
      props: {
        heading: "Course curriculum",
        subheading: "A clear learning path from foundations to advanced topics.",
        modules: [
          {
            title: "Module 1 — Foundations",
            duration: "Day 1",
            lessons: ["Core concepts and terminology", "Environment setup", "First hands-on exercise"],
          },
          {
            title: "Module 2 — Core skills",
            duration: "Day 2",
            lessons: ["Deep-dive into the main domain", "Common patterns and pitfalls", "Workshop project"],
          },
          {
            title: "Module 3 — Advanced topics",
            duration: "Day 3",
            lessons: ["Production considerations", "Integration patterns", "Capstone project"],
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
        bio: "A practitioner-first bio emphasising real production experience over theory.",
        expertise: ["Software engineering", "System design", "DevOps"],
      },
    },
    {
      id: rid("pricing"),
      type: "pricing",
      props: {
        heading: "Everything included — one price.",
        price: priceStr(course),
        currency: course.currency ?? "USD",
        period: "per seat",
        features: [
          course.durationHours ? `${course.durationHours} hours of instruction` : "Full program access",
          "All example code and repositories",
          "Course materials (PDF + digital)",
          "Certificate of completion",
          "6-month Q&A channel access",
        ],
        ctaLabel: "Enroll now",
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
            question: "What experience level is required?",
            answer: "Intermediate — you should have at least 6 months of relevant experience before attending.",
          },
          {
            question: "What equipment do I need?",
            answer: "A laptop with at least 8 GB RAM. We will provide the cloud environment.",
          },
          {
            question: "Are recordings available?",
            answer: "Yes — all sessions are recorded and accessible for 6 months post-course.",
          },
        ],
      },
    },
    {
      id: rid("form"),
      type: "form",
      props: {
        heading: "Enroll in the next cohort",
        subheading: "Share your details and we will send the onboarding kit and schedule.",
        submitLabel: "Enroll now",
        showPhone: true,
        showMessage: true,
        showConsent: true,
        consentLabel: "Keep me updated about future technical programs.",
        successHeading: "Enrollment received.",
        successMessage: "Check your inbox — the onboarding kit is on its way.",
        privacyNote: "We use your information only to administer this course.",
      },
    },
    {
      id: rid("cta"),
      type: "cta",
      props: {
        headline: `Enroll in ${course.name} today.`,
        subheadline: "Cohort size is capped to keep the quality high.",
        ctaLabel: "Enroll now",
        ctaHref: "#register",
      },
    },
  ],
};

// ── Leadership Course ─────────────────────────────────────────────────────────
const leadershipCourse: Template = {
  id: "leadership-course",
  name: "Leadership Course",
  description: "Premium, executive layout. Built for leadership, management, and soft-skills programs.",
  category: "Leadership",
  accent: "linear-gradient(135deg, #92400e, #b45309)",
  theme: { primary: "oklch(0.65 0.16 75)", radius: "lg", align: "start" },
  build: (course) => [
    {
      id: rid("hero"),
      type: "hero",
      props: {
        eyebrow: course.category ?? "Leadership program",
        headline: course.name,
        subheadline:
          course.summary ??
          "An immersive program for leaders who want to lead with clarity, influence, and impact.",
        ctaLabel: "Apply for a seat",
        ctaHref: "#register",
        imageUrl: course.imageUrl ?? undefined,
        align: "start",
      },
    },
    {
      id: rid("features"),
      type: "features",
      props: {
        heading: "What you'll develop",
        items: [
          {
            title: "Strategic thinking",
            description: "Make better decisions under pressure with proven frameworks.",
            icon: "Target",
          },
          {
            title: "Influence and communication",
            description: "Lead teams, run rooms, and communicate with executive presence.",
            icon: "MessageSquare",
          },
          {
            title: "Coaching skills",
            description: "Unlock the potential of every person on your team.",
            icon: "Users",
          },
        ],
      },
    },
    {
      id: rid("testimonials"),
      type: "testimonials",
      props: {
        heading: "Trusted by leaders across the region",
        items: [
          {
            quote: "This program reframed how I think about leadership. I lead with far more clarity now.",
            name: "Add participant name",
            role: "General Manager",
            rating: 5,
          },
          {
            quote: "Practical, honest, and challenging. The best leadership investment I've made.",
            name: "Add participant name",
            role: "Director of Operations",
            rating: 5,
          },
          {
            quote: "The peer discussions alone were worth the entire program.",
            name: "Add participant name",
            role: "Head of People",
            rating: 5,
          },
        ],
      },
    },
    {
      id: rid("instructor"),
      type: "instructor",
      props: {
        heading: "Program facilitator",
        name: "Add instructor name",
        title: "Add role or credentials",
        bio: "An executive coach and facilitator with a track record working with C-suite leaders across the region.",
        expertise: ["Executive coaching", "Organisational behaviour", "Strategic leadership"],
      },
    },
    {
      id: rid("pricing"),
      type: "pricing",
      props: {
        heading: "An investment in your leadership.",
        price: priceStr(course),
        currency: course.currency ?? "USD",
        period: "per participant",
        features: [
          course.durationHours ? `${course.durationHours} hours of facilitation` : "Full program access",
          "360° leadership assessment",
          "Personal action plan",
          "Executive cohort network access",
          "Certificate of completion",
          "One post-program coaching call",
        ],
        ctaLabel: "Apply for a seat",
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
            question: "Who is this program for?",
            answer:
              "Mid to senior managers with at least 2 years of team leadership experience.",
          },
          {
            question: "Is this eligible for corporate training budgets?",
            answer: "Yes — we can issue an official invoice and certificate for HR records.",
          },
          {
            question: "What is the cohort size?",
            answer: "Deliberately small — 12 to 16 participants — to ensure every voice is heard.",
          },
        ],
      },
    },
    {
      id: rid("form"),
      type: "form",
      props: {
        heading: "Apply for a seat",
        subheading: "Share your details and we will follow up with the program guide and next cohort dates.",
        submitLabel: "Apply now",
        showPhone: true,
        showMessage: true,
        showConsent: true,
        consentLabel: "Yes, keep me informed about future leadership programs.",
        successHeading: "Application received.",
        successMessage: "A member of our team will be in touch within one business day.",
        privacyNote: "Your details are kept confidential and never shared.",
      },
    },
    {
      id: rid("cta"),
      type: "cta",
      props: {
        headline: "Great leaders are made, not born.",
        subheadline: "Seats are extremely limited. Apply before the cohort fills.",
        ctaLabel: "Apply for a seat",
        ctaHref: "#register",
      },
    },
  ],
};

// ── Workshop ──────────────────────────────────────────────────────────────────
const workshop: Template = {
  id: "workshop",
  name: "Workshop",
  description: "Action-oriented layout. Perfect for 1–2 day practical workshops and masterclasses.",
  category: "Workshop",
  accent: "linear-gradient(135deg, #065f46, #0f766e)",
  theme: { primary: "oklch(0.6 0.17 155)", radius: "md", align: "start" },
  build: (course) => [
    {
      id: rid("hero"),
      type: "hero",
      props: {
        eyebrow: "Workshop",
        headline: course.name,
        subheadline:
          course.summary ??
          "A focused, hands-on day designed to give you immediately applicable skills — not just theory.",
        ctaLabel: "Book your place",
        ctaHref: "#register",
        imageUrl: course.imageUrl ?? undefined,
        align: "start",
      },
    },
    {
      id: rid("benefits"),
      type: "benefits",
      props: {
        heading: "What you'll leave with",
        items: [
          "A clear, actionable plan you built during the workshop",
          "Tools and templates ready to use on Monday",
          "Answers to your specific challenges from the facilitator",
          "A network of peers working through similar problems",
          "A certificate of attendance for your records",
        ],
        columns: 1,
      },
    },
    {
      id: rid("curriculum"),
      type: "curriculum",
      props: {
        heading: "Workshop agenda",
        subheading: "A structured day — with time built in to apply every concept before moving on.",
        modules: [
          {
            title: "Morning — Foundations and framing",
            duration: "09:00–12:30",
            lessons: [
              "Context and challenge mapping",
              "Core frameworks and principles",
              "Small-group exercises",
            ],
          },
          {
            title: "Afternoon — Application and practice",
            duration: "13:30–17:00",
            lessons: [
              "Hands-on working session",
              "Group feedback and refinement",
              "Personal action plan",
            ],
          },
        ],
      },
    },
    {
      id: rid("instructor"),
      type: "instructor",
      props: {
        heading: "Your facilitator",
        name: "Add facilitator name",
        title: "Add role or credentials",
        bio: "A practitioner-facilitator who has run this workshop dozens of times — and refined it each time.",
        expertise: ["Facilitation", "Problem solving", "Applied learning"],
      },
    },
    {
      id: rid("social-proof"),
      type: "social-proof",
      props: {
        stats: [
          { value: "500+", label: "Participants trained" },
          { value: "4.8 ★", label: "Average rating" },
          { value: "96%", label: "Would recommend" },
          { value: "30+", label: "Organisations" },
        ],
        note: "Run for teams across the region since 2020.",
      },
    },
    {
      id: rid("pricing"),
      type: "pricing",
      props: {
        heading: "Everything included.",
        price: priceStr(course),
        currency: course.currency ?? "USD",
        period: "per person",
        features: [
          course.durationHours ? `${course.durationHours}-hour workshop` : "Full-day workshop",
          "All materials and worksheets",
          "Lunch, coffee, and refreshments",
          "Certificate of attendance",
          "30-day follow-up Q&A access",
        ],
        ctaLabel: "Book your place",
        ctaHref: "#register",
      },
    },
    {
      id: rid("faq"),
      type: "faq",
      props: {
        heading: "FAQs",
        items: [
          {
            question: "How many people is this designed for?",
            answer: "Small groups of 8–20. Large enough for peer learning, small enough for individual attention.",
          },
          {
            question: "Can I book the workshop for my team?",
            answer: "Yes — we offer private group bookings. Contact us for pricing.",
          },
          {
            question: "What should I prepare in advance?",
            answer: "Nothing mandatory. We'll send a short one-page primer one week before the event.",
          },
        ],
      },
    },
    {
      id: rid("form"),
      type: "form",
      props: {
        heading: "Book your place",
        subheading: "Small groups fill up fast. Secure your spot and we'll send the details.",
        submitLabel: "Book my place",
        showPhone: true,
        showMessage: false,
        showConsent: true,
        consentLabel: "Keep me updated on future workshops.",
        successHeading: "You're booked in.",
        successMessage: "We'll send the venue, timing, and pre-work within 24 hours.",
        privacyNote: "We'll only use your details to manage this booking.",
      },
    },
    {
      id: rid("cta"),
      type: "cta",
      props: {
        headline: "One day. Real impact.",
        subheadline: "Spots are limited by design. Don't miss the next session.",
        ctaLabel: "Book your place",
        ctaHref: "#register",
      },
    },
  ],
};

// ── Intensive Training ────────────────────────────────────────────────────────
const intensiveTraining: Template = {
  id: "intensive-training",
  name: "Intensive Training",
  description: "High-energy, results-focused layout. Built for multi-day bootcamps and immersive programs.",
  category: "Training",
  accent: "linear-gradient(135deg, #9a3412, #c2410c)",
  theme: { primary: "oklch(0.68 0.18 42)", radius: "lg", align: "center" },
  build: (course) => [
    {
      id: rid("hero"),
      type: "hero",
      props: {
        eyebrow: "Intensive program",
        headline: course.name,
        subheadline:
          course.summary ??
          "An immersive multi-day program that compresses months of learning into an intensive, focused experience.",
        ctaLabel: "Register now",
        ctaHref: "#pricing",
        imageUrl: course.imageUrl ?? undefined,
        align: "center",
      },
    },
    {
      id: rid("social-proof"),
      type: "social-proof",
      props: {
        stats: [
          { value: "1,000+", label: "Graduates" },
          { value: "4.9 ★", label: "Satisfaction score" },
          { value: "95%", label: "Completion rate" },
          { value: "48h", label: "Of intensive training" },
        ],
        note: "Results that speak for themselves.",
      },
    },
    {
      id: rid("features"),
      type: "features",
      props: {
        heading: "Why this program works",
        items: [
          {
            title: "Immersive by design",
            description: "Full days, no distractions — the fastest path to mastery.",
            icon: "Zap",
          },
          {
            title: "Expert-led instruction",
            description: "Every session delivered by a practitioner with field experience.",
            icon: "GraduationCap",
          },
          {
            title: "Peer accountability",
            description: "You train alongside high-performers who push each other forward.",
            icon: "Users",
          },
          {
            title: "Immediate application",
            description: "Practice exercises mirror real-world challenges you face today.",
            icon: "Target",
          },
        ],
      },
    },
    {
      id: rid("curriculum"),
      type: "curriculum",
      props: {
        heading: "Program schedule",
        subheading: "Every day builds on the last — by the end, you'll have covered more ground than most courses do in a month.",
        modules: [
          {
            title: "Day 1 — Foundations",
            duration: "Full day",
            lessons: [
              "Orientation and goal-setting",
              "Core frameworks and mental models",
              "Applied exercises and debrief",
            ],
          },
          {
            title: "Day 2 — Deep practice",
            duration: "Full day",
            lessons: [
              "Advanced techniques",
              "Live simulations and role-play",
              "Peer feedback sessions",
            ],
          },
          {
            title: "Day 3 — Integration and mastery",
            duration: "Full day",
            lessons: [
              "Putting it all together",
              "Capstone challenge",
              "Graduation and next steps",
            ],
          },
        ],
      },
    },
    {
      id: rid("testimonials"),
      type: "testimonials",
      props: {
        heading: "What our graduates say",
        items: [
          {
            quote: "Three days that changed three years of habits. I came in skeptical and left converted.",
            name: "Add participant name",
            role: "Senior Manager",
            rating: 5,
          },
          {
            quote: "Intense — in the best way. I got more from this than from the last two courses combined.",
            name: "Add participant name",
            role: "Team Lead",
            rating: 5,
          },
          {
            quote: "The calibre of the other participants was itself worth the investment.",
            name: "Add participant name",
            role: "Operations Director",
            rating: 5,
          },
        ],
      },
    },
    {
      id: rid("instructor"),
      type: "instructor",
      props: {
        heading: "Lead instructor",
        name: "Add instructor name",
        title: "Add role or credentials",
        bio: "An industry veteran who has designed and run intensive programs for thousands of professionals.",
        expertise: ["Training design", "Performance coaching", "Organisational learning"],
      },
    },
    {
      id: rid("pricing"),
      type: "pricing",
      props: {
        heading: "Full program — everything included.",
        price: priceStr(course),
        currency: course.currency ?? "USD",
        period: "per participant",
        features: [
          course.durationHours ? `${course.durationHours} hours of intensive training` : "Full multi-day program",
          "All training materials and workbooks",
          "Meals and refreshments throughout",
          "Access to alumni network",
          "Certificate of completion",
          "60-day post-program coaching check-in",
        ],
        ctaLabel: "Register now",
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
            question: "How demanding is the schedule?",
            answer: "Very — each day runs 9am to 6pm with structured breaks. Come rested and ready.",
          },
          {
            question: "Is accommodation included?",
            answer: "Not by default, but we can arrange discounted rates at the venue hotel on request.",
          },
          {
            question: "What is the cancellation policy?",
            answer: "Full refund up to 14 days before the program. Within 14 days, your seat can be transferred.",
          },
          {
            question: "Can my company sponsor multiple employees?",
            answer: "Yes — group discounts apply from 3+ participants. Contact us for a quote.",
          },
        ],
      },
    },
    {
      id: rid("form"),
      type: "form",
      props: {
        heading: "Register now",
        subheading: "Limited to a small cohort. Secure your place before the program fills.",
        submitLabel: "Register now",
        showPhone: true,
        showMessage: true,
        showConsent: true,
        consentLabel: "Yes, keep me informed about future intensive programs.",
        successHeading: "Registration received.",
        successMessage: "Our team will contact you within 24 hours to confirm your place and send the pre-work.",
        privacyNote: "Your information is used only to administer your registration.",
      },
    },
    {
      id: rid("cta"),
      type: "cta",
      props: {
        headline: "Your most productive three days this year.",
        subheadline: "Small cohort. No filler. Maximum impact.",
        ctaLabel: "Register now",
        ctaHref: "#register",
      },
    },
  ],
};

export const TEMPLATES: Template[] = [
  businessCourse,
  marketingCourse,
  technologyCourse,
  leadershipCourse,
  workshop,
  aiWorkshop,
  intensiveTraining,
];

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
