import "server-only";
import { prisma } from "@/lib/prisma";
import { NotificationTypes, type NotificationType } from "./types";

export type Channel = "telegram" | "inapp";

// Canonical defaults for all notification types on the telegram channel.
// true = on by default, false = off by default (user must enable).
export const DEFAULT_PREFERENCES: Record<NotificationType, boolean> = {
  // Tasks — all on by default
  [NotificationTypes.TASK_ASSIGNED]: true,
  [NotificationTypes.TASK_REMINDER]: true,
  [NotificationTypes.TASK_OVERDUE]: true,

  // Course Runs
  [NotificationTypes.COURSE_RUN_NEAR_CAPACITY]: true,
  [NotificationTypes.COURSE_RUN_CAPACITY_REACHED]: true,
  [NotificationTypes.COURSE_RUN_REMINDER]: true,
  [NotificationTypes.COURSE_RUN_TODAY]: true,
  [NotificationTypes.COURSE_RUN_RESCHEDULED]: true,
  [NotificationTypes.COURSE_RUN_LOCATION_CHANGED]: true,
  [NotificationTypes.COURSE_RUN_CANCELLED]: true,

  // Payments
  [NotificationTypes.PAYMENT_PENDING]: true,
  [NotificationTypes.PAYMENT_RECORDED]: true,
  [NotificationTypes.PAYMENT_CONFIRMED]: true,
  [NotificationTypes.PAYMENT_REJECTED]: true,
  [NotificationTypes.PAYMENT_BALANCE_CLEARED]: true,

  // Leads
  [NotificationTypes.LEAD_ASSIGNED]: true,
  [NotificationTypes.LEAD_REASSIGNED]: true,
  [NotificationTypes.LEAD_UNASSIGNED_ALERT]: true,
  [NotificationTypes.TEAM_OVERDUE_ALERT]: true,

  // Registrations
  [NotificationTypes.REGISTRATION_CONFIRMED]: true,
  [NotificationTypes.REGISTRATION_CANCELLED]: true,
  [NotificationTypes.REGISTRATION_RUN_CHANGED]: true,

  // Finance
  [NotificationTypes.BALANCE_OUTSTANDING]: true,
  [NotificationTypes.EXPENSE_THRESHOLD_EXCEEDED]: true,

  // Attendance
  [NotificationTypes.ATTENDANCE_NO_SHOW]: true,

  // Digest — off by default (opt-in)
  [NotificationTypes.DAILY_DIGEST]: false,

  // Commissions & Refunds
  [NotificationTypes.COMMISSION_EARNED]: true,
  [NotificationTypes.COMMISSION_ADJUSTED]: true,
  [NotificationTypes.COMMISSION_PAYOUT_PROCESSED]: true,
  [NotificationTypes.REFUND_REQUESTED]: true,
  [NotificationTypes.REFUND_APPROVED]: true,
  [NotificationTypes.REFUND_REJECTED]: true,

  // Live Classroom
  [NotificationTypes.LIVE_SESSION_REMINDER]: true,
  [NotificationTypes.LIVE_SESSION_STARTED]: true,
  [NotificationTypes.LIVE_SESSION_STUDENT_JOIN]: true,
  [NotificationTypes.LIVE_SESSION_RECORDING_READY]: true,
  [NotificationTypes.LIVE_SESSION_STUDENT_REMINDER]: true,
  [NotificationTypes.LIVE_SESSION_STUDENT_RECORDING_READY]: true,

  // Deprecated — keep defaults for backward compat
  [NotificationTypes.SESSION_NEAR_CAPACITY]: false,
  [NotificationTypes.SESSION_REMINDER]: true,
  [NotificationTypes.SESSION_TODAY]: true,
  [NotificationTypes.COURSE_UPDATE]: false,
};

const ALL_TYPES = Object.values(NotificationTypes) as NotificationType[];

// Seeds default preference rows for an employee.
// Safe to call on every settings-page load — skipDuplicates is a no-op if rows exist.
export async function ensureDefaultPreferences(
  employeeId: string,
  channel: Channel = "telegram"
): Promise<void> {
  await prisma.notificationPreference.createMany({
    data: ALL_TYPES.map((type) => ({
      employeeId,
      type,
      channel,
      enabled: DEFAULT_PREFERENCES[type] ?? false,
    })),
    skipDuplicates: true,
  });
}

// Returns true if this employee+type+channel notification is enabled.
// Falls back to the hard-coded default when no row exists (e.g., before first visit).
export async function isPreferenceEnabled(
  employeeId: string,
  type: NotificationType,
  channel: Channel
): Promise<boolean> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { employeeId_type_channel: { employeeId, type, channel } },
    select: { enabled: true },
  });
  return pref !== null ? pref.enabled : (DEFAULT_PREFERENCES[type] ?? false);
}

// Returns the current preferences for a given employee+channel.
// Merges DB rows over the defaults so missing rows resolve to their defaults.
export async function getPreferencesMap(
  employeeId: string,
  channel: Channel
): Promise<Record<NotificationType, boolean>> {
  const rows = await prisma.notificationPreference.findMany({
    where: { employeeId, channel },
    select: { type: true, enabled: true },
  });
  const result = { ...DEFAULT_PREFERENCES };
  for (const row of rows) {
    const t = row.type as NotificationType;
    if (t in result) result[t] = row.enabled;
  }
  return result;
}
