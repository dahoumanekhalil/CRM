import {
  PrismaClient,
  LeadStatus,
  CourseStatus,
  CourseLevel,
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

  const leadCount = await prisma.lead.count();
  const courseCount = await prisma.course.count();
  console.log(`Done. Leads: ${leadCount}, Courses: ${courseCount}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
