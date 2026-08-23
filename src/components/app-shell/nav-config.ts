import {
  LayoutDashboard,
  CheckSquare,
  Users2,
  Contact,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Megaphone,
  Globe,
  FileInput,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  Bot,
  TrendingUp,
  Target,
  ShoppingBag,
  BadgeDollarSign,
  DollarSign,
  RotateCcw,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  matchPrefix?: boolean;
  // Which permission gates this item. Omitted = always visible to signed-in.
  permission?: Permission;
  // If the target route doesn't exist yet, hide from the sidebar so employees
  // don't hit 404s. Flip to true once the route ships.
  built?: boolean;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

// Grouped, minimal navigation per DESIGN.md §6 and Phase 15 approved structure.
export const navGroups: NavGroup[] = [
  {
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard.view",
        built: true,
      },
      {
        label: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
        matchPrefix: true,
        permission: "tasks.view",
        built: true,
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        label: "Sales Ops",
        href: "/sales",
        icon: TrendingUp,
        matchPrefix: true,
        permission: "sales.view",
        built: true,
      },
      {
        label: "My Leads",
        href: "/my-leads",
        icon: Target,
        matchPrefix: true,
        permission: "leads.view",
        built: true,
      },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        label: "Leads",
        href: "/leads",
        icon: Contact,
        matchPrefix: true,
        permission: "leads.view",
        built: true,
      },
      {
        label: "Students",
        href: "/students",
        icon: GraduationCap,
        matchPrefix: true,
        permission: "students.view",
        built: true,
      },
    ],
  },
  {
    label: "Courses",
    items: [
      {
        label: "All courses",
        href: "/courses",
        icon: BookOpen,
        matchPrefix: true,
        permission: "courses.view",
        built: true,
      },
      {
        label: "Course Runs",
        href: "/sessions",
        icon: CalendarDays,
        matchPrefix: true,
        permission: "sessions.view",
        built: true,
      },
      {
        label: "Instructors",
        href: "/instructors",
        icon: Users2,
        matchPrefix: true,
        permission: "courses.view",
        built: true,
      },
      {
        label: "Attendance",
        href: "/attendance",
        icon: ClipboardCheck,
        matchPrefix: true,
        permission: "attendance.view",
        built: true,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Payments",
        href: "/payments",
        icon: Wallet,
        matchPrefix: true,
        permission: "payments.view",
        built: true,
      },
      {
        label: "Expenses",
        href: "/finance/expenses",
        icon: ShoppingBag,
        matchPrefix: true,
        permission: "finance.view",
        built: true,
      },
      {
        label: "Financial Overview",
        href: "/transactions",
        icon: Receipt,
        matchPrefix: true,
        permission: "payments.view",
        built: true,
      },
      {
        label: "Refunds",
        href: "/refunds",
        icon: RotateCcw,
        matchPrefix: true,
        permission: "refunds.approve",
        built: true,
      },
      {
        label: "Commission Payouts",
        href: "/finance/payouts",
        icon: DollarSign,
        matchPrefix: true,
        permission: "commissions.payout",
        built: true,
      },
    ],
  },
  {
    label: "Commissions",
    items: [
      {
        label: "My Commissions",
        href: "/my-commissions",
        icon: BadgeDollarSign,
        matchPrefix: true,
        permission: "commissions.view.own",
        built: true,
      },
      {
        label: "Team Commissions",
        href: "/commissions/manage",
        icon: TrendingUp,
        matchPrefix: true,
        permission: "commissions.view.team",
        built: true,
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        label: "Campaigns",
        href: "/campaigns",
        icon: Megaphone,
        matchPrefix: true,
        permission: "campaigns.view",
        built: true,
      },
      {
        label: "Landing pages",
        href: "/landing-pages",
        icon: Globe,
        matchPrefix: true,
        permission: "landing-pages.view",
        built: true,
      },
      {
        label: "Forms",
        href: "/landing-pages/forms",
        icon: FileInput,
        matchPrefix: true,
        permission: "landing-pages.view",
        built: true,
      },
    ],
  },
  {
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
        matchPrefix: true,
        permission: "reports.view",
        built: true,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        matchPrefix: false,
        permission: "settings.view",
        built: true,
      },
      {
        label: "Commission Rules",
        href: "/settings/commissions",
        icon: BadgeDollarSign,
        matchPrefix: true,
        permission: "settings.write",
        built: true,
      },
      {
        label: "Telegram",
        href: "/settings/telegram",
        icon: Bot,
        matchPrefix: true,
        permission: "telegram.admin",
        built: true,
      },
    ],
  },
  // ── Phase 1 POC — remove or promote to real route in Phase 2 ──────────────
  {
    label: "Lab",
    items: [
      {
        label: "Live Test",
        href: "/live-test",
        icon: Video,
        matchPrefix: true,
        built: true,
      },
    ],
  },
];
