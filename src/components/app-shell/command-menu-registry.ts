import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Contact,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Plus,
  Receipt,
  Settings,
  Users,
  Users2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// User roles that can appear in a session (mirrors Prisma enum UserRole).
export type UserRole =
  | "ADMIN"
  | "MANAGER"
  | "SALES"
  | "MARKETING"
  | "TRAINER"
  | "FINANCE"
  | "EMPLOYEE";

export type CommandGroup = "create" | "goto" | "action";

export interface StaticCommand {
  id: string;
  group: CommandGroup;
  label: string;
  // Extra terms cmdk fuzzy-matches against so "new" surfaces "Create course".
  keywords?: string[];
  icon: LucideIcon;
  href: string;
  // Roles allowed to see this command. Undefined = every role.
  roles?: readonly UserRole[];
  // If false, the command is defined but hidden until the target route ships —
  // avoids leading users to a 404 while keeping the intent visible in code review.
  available: boolean;
}

// Settings access is Admin-only (comment retained for future reference).
// const MANAGER_UP: readonly UserRole[] = ["ADMIN", "MANAGER"];

// The one place commands are declared. Add new entries here — the command
// palette picks them up automatically.
export const COMMANDS: readonly StaticCommand[] = [
  // ─── Create ─────────────────────────────────────────────
  {
    id: "create.task",
    group: "create",
    label: "Create task",
    keywords: ["new", "add", "task", "todo", "reminder", "follow-up"],
    icon: Plus,
    href: "/tasks?new=1",
    available: true,
  },
  {
    id: "create.course",
    group: "create",
    label: "Create course",
    keywords: ["new", "add", "course"],
    icon: Plus,
    href: "/courses?new=1",
    roles: ["ADMIN", "MANAGER"] as const,
    available: true,
  },
  {
    id: "create.lead",
    group: "create",
    label: "Create lead",
    keywords: ["new", "add", "lead", "prospect"],
    icon: Plus,
    href: "/leads?new=1",
    roles: ["ADMIN", "MANAGER", "SALES", "MARKETING"] as const,
    available: true,
  },
  {
    id: "create.landing-page",
    group: "create",
    label: "Create landing page",
    keywords: ["new", "page", "landing", "website"],
    icon: Plus,
    href: "/landing-pages/new",
    roles: ["ADMIN", "MANAGER", "MARKETING"] as const,
    available: true,
  },
  {
    id: "create.session",
    group: "create",
    label: "Create session",
    keywords: ["new", "add", "session", "cohort", "schedule"],
    icon: Plus,
    href: "/sessions?new=1",
    roles: ["ADMIN", "MANAGER"] as const,
    available: true,
  },
  {
    id: "create.payment",
    group: "create",
    label: "Record payment",
    keywords: ["new", "add", "payment", "money", "invoice", "receipt"],
    icon: Plus,
    href: "/payments?new=1",
    roles: ["ADMIN", "MANAGER", "FINANCE"],
    available: true,
  },
  {
    id: "create.campaign",
    group: "create",
    label: "Create campaign",
    keywords: ["new", "add", "campaign", "marketing", "ads"],
    icon: Plus,
    href: "/campaigns?new=1",
    roles: ["ADMIN", "MANAGER", "MARKETING"],
    available: true,
  },
  {
    id: "create.student",
    group: "create",
    label: "Create student",
    keywords: ["new", "add", "student", "learner"],
    icon: Plus,
    href: "/students?new=1",
    roles: ["ADMIN", "MANAGER", "SALES"] as const,
    available: true,
  },
  {
    id: "create.instructor",
    group: "create",
    label: "Create instructor",
    keywords: ["new", "add", "instructor", "trainer", "educator"],
    icon: Plus,
    href: "/instructors?new=1",
    available: true,
  },

  // ─── Go to ──────────────────────────────────────────────
  {
    id: "goto.tasks",
    group: "goto",
    label: "Tasks",
    keywords: ["todos", "reminders", "follow-ups", "actions"],
    icon: CheckSquare,
    href: "/tasks",
    available: true,
  },
  {
    id: "goto.dashboard",
    group: "goto",
    label: "Overview",
    keywords: ["dashboard", "home", "kpi", "metrics"],
    icon: LayoutDashboard,
    href: "/dashboard",
    available: true,
  },
  {
    id: "goto.leads",
    group: "goto",
    label: "Leads",
    keywords: ["prospects", "pipeline", "crm"],
    icon: Contact,
    href: "/leads",
    available: true,
  },
  {
    id: "goto.customers",
    group: "goto",
    label: "Go to Customers",
    keywords: ["clients", "accounts", "payers", "revenue"],
    icon: Users,
    href: "/customers",
    available: false,
  },
  {
    id: "goto.students",
    group: "goto",
    label: "Students",
    keywords: ["learners", "attendees"],
    icon: GraduationCap,
    href: "/students",
    available: true,
  },
  {
    id: "goto.courses",
    group: "goto",
    label: "Courses",
    keywords: ["trainings", "programs"],
    icon: BookOpen,
    href: "/courses",
    available: true,
  },
  {
    id: "goto.instructors",
    group: "goto",
    label: "Instructors",
    keywords: ["trainers", "educators", "teachers"],
    icon: Users2,
    href: "/instructors",
    available: true,
  },
  {
    id: "goto.sessions",
    group: "goto",
    label: "Sessions",
    keywords: ["cohorts", "schedule", "dates"],
    icon: CalendarDays,
    href: "/sessions",
    available: true,
  },
  {
    id: "goto.attendance",
    group: "goto",
    label: "Attendance",
    keywords: ["check-in", "present", "absent", "roster"],
    icon: ClipboardCheck,
    href: "/attendance",
    roles: ["ADMIN", "MANAGER", "TRAINER"],
    available: true,
  },
  {
    id: "goto.campaigns",
    group: "goto",
    label: "Campaigns",
    keywords: ["marketing", "ads", "attribution", "utm"],
    icon: Megaphone,
    href: "/campaigns",
    roles: ["ADMIN", "MANAGER", "MARKETING"],
    available: true,
  },
  {
    id: "goto.landing-pages",
    group: "goto",
    label: "Landing pages",
    keywords: ["websites", "marketing", "pages"],
    icon: Globe,
    href: "/landing-pages",
    available: true,
  },
  {
    id: "goto.payments",
    group: "goto",
    label: "Payments",
    keywords: ["billing", "invoices", "revenue", "money"],
    icon: Wallet,
    href: "/payments",
    roles: ["ADMIN", "MANAGER", "FINANCE"],
    available: true,
  },
  {
    id: "goto.transactions",
    group: "goto",
    label: "Transactions",
    keywords: ["billing", "ledger"],
    icon: Receipt,
    href: "/transactions",
    roles: ["ADMIN", "MANAGER", "FINANCE"],
    available: false,
  },
  {
    id: "goto.reports",
    group: "goto",
    label: "Reports",
    keywords: ["analytics", "insights", "revenue", "funnel"],
    icon: BarChart3,
    href: "/reports",
    roles: ["ADMIN", "MANAGER"],
    available: true,
  },
  {
    id: "goto.settings",
    group: "goto",
    label: "Settings",
    keywords: ["preferences", "workspace", "team", "users", "roles"],
    icon: Settings,
    href: "/settings",
    roles: ["ADMIN"] as const,
    available: true,
  },
] as const;

export function filterCommands(role: UserRole | undefined): StaticCommand[] {
  return COMMANDS.filter((c) => {
    if (!c.available) return false;
    if (!c.roles) return true;
    if (!role) return false;
    return c.roles.includes(role);
  });
}

export function findCommandById(id: string): StaticCommand | undefined {
  return COMMANDS.find((c) => c.id === id);
}
