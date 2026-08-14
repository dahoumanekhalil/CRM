// Role-based permission model.
//
// One place to declare who can do what — pages, server actions, and the
// sidebar all consult this map so we don't drift. Add a new capability by
// adding a row here first.
//
// Roles are the Prisma UserRole enum values. Undefined role (no session) is
// treated as no permissions.

export type UserRole =
  | "ADMIN"
  | "MANAGER"
  | "SALES"
  | "MARKETING"
  | "TRAINER"
  | "FINANCE"
  | "EMPLOYEE";

export const ALL_ROLES: readonly UserRole[] = [
  "ADMIN",
  "MANAGER",
  "SALES",
  "MARKETING",
  "TRAINER",
  "FINANCE",
  "EMPLOYEE",
];

// Convenience buckets — keep in sync with the map below.
const MANAGERS: readonly UserRole[] = ["ADMIN", "MANAGER"];
const SALES_SIDE: readonly UserRole[] = [
  "ADMIN",
  "MANAGER",
  "SALES",
  "MARKETING",
  "EMPLOYEE",
];
const OPS_SIDE: readonly UserRole[] = [
  "ADMIN",
  "MANAGER",
  "TRAINER",
  "SALES",
  "FINANCE",
  "EMPLOYEE",
];
const FINANCE_SIDE: readonly UserRole[] = ["ADMIN", "MANAGER", "FINANCE"];
const MARKETING_SIDE: readonly UserRole[] = ["ADMIN", "MANAGER", "MARKETING"];
const TRAINERS: readonly UserRole[] = ["ADMIN", "MANAGER", "TRAINER"];

export const PERMISSIONS = {
  // Overview — anyone signed in.
  "dashboard.view": ALL_ROLES,

  // Sales / CRM
  "leads.view": SALES_SIDE,
  "leads.write": ["ADMIN", "MANAGER", "SALES", "MARKETING"] as const,
  "students.view": OPS_SIDE,
  "students.write": ["ADMIN", "MANAGER", "SALES"] as const,

  // Courses & scheduling
  "courses.view": ALL_ROLES,
  "courses.write": MANAGERS,
  "sessions.view": OPS_SIDE,
  "sessions.write": MANAGERS,
  "registrations.write": ["ADMIN", "MANAGER", "SALES"] as const,

  // Attendance
  "attendance.view": TRAINERS,
  "attendance.write": TRAINERS,

  // Marketing
  "landing-pages.view": MARKETING_SIDE,
  "landing-pages.write": MARKETING_SIDE,
  "campaigns.view": MARKETING_SIDE,
  "campaigns.write": MARKETING_SIDE,

  // Finance
  "payments.view": FINANCE_SIDE,
  "payments.write": FINANCE_SIDE,

  // Insights
  "reports.view": MANAGERS,

  // Tasks — all roles can create and view (scoped by ownership in the query layer)
  "tasks.view": ALL_ROLES,
  "tasks.write": ALL_ROLES,

  // Settings — Admin only.
  "settings.view": ["ADMIN"] as const,
  "settings.write": ["ADMIN"] as const,
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(
  role: string | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

// Returns the subset of a role's granted permissions — handy for debug UIs.
export function permissionsForRole(role: string | undefined): Permission[] {
  if (!role) return [];
  return (Object.entries(PERMISSIONS) as Array<[Permission, readonly string[]]>)
    .filter(([, roles]) => roles.includes(role))
    .map(([p]) => p);
}
