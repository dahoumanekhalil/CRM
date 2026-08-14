import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Users2,
  Contact,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Megaphone,
  Globe,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
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

// Grouped, minimal navigation per DESIGN.md §6.
// Do not overload — every item must earn its place.
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
        label: "Leads",
        href: "/leads",
        icon: Contact,
        matchPrefix: true,
        permission: "leads.view",
        built: true,
      },
      {
        label: "Customers",
        href: "/customers",
        icon: Users,
        matchPrefix: true,
        permission: "students.view",
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
        label: "Sessions",
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
        label: "Transactions",
        href: "/transactions",
        icon: Receipt,
        matchPrefix: true,
        permission: "payments.view",
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
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        matchPrefix: true,
        permission: "settings.view",
        built: true,
      },
    ],
  },
];
