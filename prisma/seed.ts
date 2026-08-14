import {
  PrismaClient,
  LeadStatus,
  CourseStatus,
  CourseLevel,
  SessionStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// -------- Leads --------

const sampleLeads: Array<{
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  source?: string;
  tags?: string[];
  notes?: string;
}> = [
  {
    firstName: "Amelia",
    lastName: "Chen",
    email: "amelia.chen@novastudio.co",
    phone: "+1 415 555 0132",
    status: "NEW",
    source: "Website",
    tags: ["enterprise"],
    notes: "Interested in the AI Foundations 3-day workshop.",
  },
  {
    firstName: "Marcus",
    lastName: "Reyes",
    email: "marcus@looplabs.io",
    phone: "+1 213 555 0114",
    status: "CONTACTED",
    source: "Referral",
    tags: ["hot"],
  },
  {
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.patel@vertex.group",
    status: "INTERESTED",
    source: "LinkedIn",
    tags: ["team-of-8"],
    notes: "Wants a private cohort for 8 people in Dubai.",
  },
  {
    firstName: "Julian",
    lastName: "Ford",
    email: "julian@techflow.io",
    status: "FOLLOW_UP",
    source: "Event",
  },
  {
    firstName: "Sara",
    lastName: "Al-Mansour",
    email: "sara@almansour.sa",
    phone: "+966 55 555 0100",
    status: "REGISTERED",
    source: "Website",
    tags: ["vip"],
  },
  {
    firstName: "Diego",
    lastName: "Nunes",
    email: "diego@labs.br",
    status: "NEW",
    source: "Cold outreach",
  },
  {
    firstName: "Nadia",
    lastName: "Kowalski",
    email: "nadia.k@artstudio.pl",
    phone: "+48 500 555 011",
    status: "CONTACTED",
    source: "Instagram",
  },
  {
    firstName: "Omar",
    lastName: "Haddad",
    email: "omar@haddad.tn",
    status: "LOST",
    source: "Website",
    notes: "Chose a competitor this cycle.",
  },
  {
    firstName: "Fatima",
    lastName: "Zahra",
    email: "fatima@ecom.ma",
    phone: "+212 6 12 345 678",
    status: "INTERESTED",
    source: "Referral",
    tags: ["arabic-speaker"],
  },
  {
    firstName: "Ryu",
    lastName: "Ito",
    email: "ryu.ito@ito.jp",
    status: "NEW",
    source: "Website",
  },
];

// -------- Courses --------

const sampleCourses: Array<{
  name: string;
  slug: string;
  summary?: string;
  description?: string;
  category?: string;
  level: CourseLevel;
  durationHours?: number;
  basePrice?: number;
  currency?: string;
  status: CourseStatus;
}> = [
  {
    name: "AI Foundations for Business",
    slug: "ai-foundations-for-business",
    summary: "A 3-day intensive on applied AI for non-technical leaders.",
    description:
      "Understand how modern AI systems work, evaluate use cases, and build a roadmap for your organization. Includes hands-on prompt engineering labs.",
    category: "AI",
    level: "BEGINNER",
    durationHours: 24,
    basePrice: 1490,
    currency: "USD",
    status: "PUBLISHED",
  },
  {
    name: "Advanced Digital Marketing",
    slug: "advanced-digital-marketing",
    summary: "Performance marketing across paid, organic and email.",
    category: "Marketing",
    level: "ADVANCED",
    durationHours: 40,
    basePrice: 1990,
    currency: "USD",
    status: "PUBLISHED",
  },
  {
    name: "Leadership Bootcamp",
    slug: "leadership-bootcamp",
    summary: "A 5-day residential program for emerging managers.",
    category: "Leadership",
    level: "INTERMEDIATE",
    durationHours: 40,
    basePrice: 2490,
    currency: "USD",
    status: "PUBLISHED",
  },
  {
    name: "Product Design Sprint",
    slug: "product-design-sprint",
    summary: "Run a full design sprint from opportunity to prototype.",
    category: "Design",
    level: "INTERMEDIATE",
    durationHours: 32,
    basePrice: 1290,
    currency: "USD",
    status: "PUBLISHED",
  },
  {
    name: "Data Storytelling for Analysts",
    slug: "data-storytelling-for-analysts",
    summary: "Turn dashboards into decisions.",
    category: "Data",
    level: "INTERMEDIATE",
    durationHours: 16,
    basePrice: 890,
    currency: "USD",
    status: "DRAFT",
  },
  {
    name: "Executive AI Masterclass",
    slug: "executive-ai-masterclass",
    summary: "A private 2-day class for C-suite leaders.",
    category: "AI",
    level: "PROFESSIONAL",
    durationHours: 16,
    basePrice: 4990,
    currency: "USD",
    status: "DRAFT",
  },
  {
    name: "Financial Modeling Essentials",
    slug: "financial-modeling-essentials",
    summary: "Build robust three-statement models from scratch.",
    category: "Finance",
    level: "BEGINNER",
    durationHours: 24,
    basePrice: 990,
    currency: "USD",
    status: "PUBLISHED",
  },
  {
    name: "Legacy Ops Playbook",
    slug: "legacy-ops-playbook",
    summary: "Archived — replaced by the Modern Ops program.",
    category: "Operations",
    level: "BEGINNER",
    durationHours: 12,
    basePrice: 490,
    currency: "USD",
    status: "ARCHIVED",
  },
];

// Helper: build a date relative to today
function daysFromNow(n: number, hour = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

type SessionSeed = {
  courseSlug: string;
  title?: string;
  startDate: Date;
  endDate: Date;
  location: string;
  city: string;
  capacity: number;
  price?: number;
  status: SessionStatus;
};

const sampleSessions: SessionSeed[] = [
  // AI Foundations — session running today
  {
    courseSlug: "ai-foundations-for-business",
    title: "AI Foundations — August 2026",
    startDate: daysFromNow(0, 9),
    endDate: daysFromNow(2, 17),
    location: "Webscale Training Center, Floor 3",
    city: "Dubai",
    capacity: 20,
    price: 1490,
    status: "IN_PROGRESS",
  },
  // AI Foundations — upcoming
  {
    courseSlug: "ai-foundations-for-business",
    title: "AI Foundations — September 2026",
    startDate: daysFromNow(18, 9),
    endDate: daysFromNow(20, 17),
    location: "Webscale Training Center, Floor 3",
    city: "Dubai",
    capacity: 20,
    price: 1490,
    status: "OPEN",
  },
  // Digital Marketing — starting in 3 days
  {
    courseSlug: "advanced-digital-marketing",
    title: "Digital Marketing — Aug/Sep 2026",
    startDate: daysFromNow(3, 9),
    endDate: daysFromNow(10, 17),
    location: "Innovation Hub, Room B2",
    city: "Riyadh",
    capacity: 15,
    price: 1990,
    status: "UPCOMING",
  },
  // Leadership Bootcamp — full, upcoming
  {
    courseSlug: "leadership-bootcamp",
    title: "Leadership Bootcamp — Q3 2026",
    startDate: daysFromNow(7, 8),
    endDate: daysFromNow(11, 18),
    location: "Grand Rotana Hotel",
    city: "Abu Dhabi",
    capacity: 12,
    price: 2490,
    status: "FULL",
  },
  // Leadership Bootcamp — next cohort open
  {
    courseSlug: "leadership-bootcamp",
    title: "Leadership Bootcamp — Q4 2026",
    startDate: daysFromNow(45, 8),
    endDate: daysFromNow(49, 18),
    location: "Grand Rotana Hotel",
    city: "Abu Dhabi",
    capacity: 12,
    price: 2490,
    status: "OPEN",
  },
  // Product Design Sprint — past (completed)
  {
    courseSlug: "product-design-sprint",
    title: "Design Sprint — July 2026",
    startDate: daysFromNow(-20, 9),
    endDate: daysFromNow(-16, 17),
    location: "Co-Create Studio",
    city: "Dubai",
    capacity: 18,
    price: 1290,
    status: "COMPLETED",
  },
  // Financial Modeling — upcoming
  {
    courseSlug: "financial-modeling-essentials",
    title: "Financial Modeling — September 2026",
    startDate: daysFromNow(22, 9),
    endDate: daysFromNow(24, 17),
    location: "Webscale Training Center, Floor 2",
    city: "Dubai",
    capacity: 16,
    price: 990,
    status: "UPCOMING",
  },
];

async function main() {
  console.log("Seeding…");

  const admin = await prisma.user.findFirst({
    where: { email: "admin@webscale.dev" },
  });

  for (const lead of sampleLeads) {
    const exists = await prisma.lead.findFirst({
      where: { email: lead.email },
    });
    if (exists) continue;
    await prisma.lead.create({
      data: { ...lead, ownerId: admin?.id },
    });
  }

  for (const course of sampleCourses) {
    const exists = await prisma.course.findFirst({
      where: { slug: course.slug },
    });
    if (exists) continue;
    await prisma.course.create({
      data: { ...course, createdById: admin?.id },
    });
  }

  // Sessions — skip if the course already has sessions (idempotent)
  for (const s of sampleSessions) {
    const course = await prisma.course.findUnique({
      where: { slug: s.courseSlug },
      select: { id: true },
    });
    if (!course) continue;

    const existing = await prisma.courseSession.findFirst({
      where: { courseId: course.id, title: s.title ?? undefined },
    });
    if (existing) continue;

    await prisma.courseSession.create({
      data: {
        courseId: course.id,
        title: s.title,
        startDate: s.startDate,
        endDate: s.endDate,
        location: s.location,
        city: s.city,
        capacity: s.capacity,
        price: s.price,
        status: s.status,
      },
    });
  }

  const leadCount = await prisma.lead.count();
  const courseCount = await prisma.course.count();
  const sessionCount = await prisma.courseSession.count();
  console.log(
    `Done. Leads: ${leadCount}, Courses: ${courseCount}, Sessions: ${sessionCount}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
