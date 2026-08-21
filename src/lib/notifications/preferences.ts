import "server-only";
import { prisma } from "@/lib/prisma";
import { NotificationTypes, type NotificationType } from "./types";

export type Channel = "telegram" | "inapp";

// Canonical defaults for all notification types on the telegram channel.
// Preferences are seeded from this map on first settings-page visit.
// The TelegramProvider falls back to this map when no preference row exists.
export const DEFAULT_PREFERENCES: Record<NotificationType, boolean> = {
  [NotificationTypes.TASK_ASSIGNED]: true,
  [NotificationTypes.TASK_REMINDER]: true,
  [NotificationTypes.TASK_OVERDUE]: true,
  [NotificationTypes.SESSION_NEAR_CAPACITY]: false,
  [NotificationTypes.SESSION_REMINDER]: true,
  [NotificationTypes.SESSION_TODAY]: true,
  [NotificationTypes.COURSE_UPDATE]: false,
  [NotificationTypes.PAYMENT_PENDING]: true,
  [NotificationTypes.PAYMENT_RECORDED]: true,
  [NotificationTypes.LEAD_ASSIGNED]: true,
  [NotificationTypes.LEAD_UNASSIGNED_ALERT]: true,
  [NotificationTypes.TEAM_OVERDUE_ALERT]: true,
  [NotificationTypes.BALANCE_OUTSTANDING]: true,
  [NotificationTypes.DAILY_DIGEST]: false,
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
      enabled: DEFAULT_PREFERENCES[type],
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
