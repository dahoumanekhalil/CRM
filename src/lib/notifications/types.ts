// All valid notification types across the system.
// Add new types here — business modules reference these constants, never raw strings.
export const NotificationTypes = {
  // ── Tasks ──────────────────────────────────────────────────────────────────
  TASK_ASSIGNED: "task.assigned",
  TASK_REMINDER: "task.reminder",
  TASK_OVERDUE: "task.overdue",

  // ── Course Runs (الدورات الجارية) ────────────────────────────────────────
  COURSE_RUN_NEAR_CAPACITY: "courseRun.nearCapacity",
  COURSE_RUN_CAPACITY_REACHED: "courseRun.capacityReached",
  COURSE_RUN_REMINDER: "courseRun.reminder",
  COURSE_RUN_TODAY: "courseRun.today",
  COURSE_RUN_RESCHEDULED: "courseRun.rescheduled",
  COURSE_RUN_LOCATION_CHANGED: "courseRun.locationChanged",
  COURSE_RUN_CANCELLED: "courseRun.cancelled",

  // ── Payments ───────────────────────────────────────────────────────────────
  PAYMENT_PENDING: "payment.pending",
  PAYMENT_RECORDED: "payment.recorded",
  PAYMENT_CONFIRMED: "payment.confirmed",
  PAYMENT_REJECTED: "payment.rejected",
  PAYMENT_BALANCE_CLEARED: "payment.balanceCleared",

  // ── Leads ─────────────────────────────────────────────────────────────────
  LEAD_ASSIGNED: "lead.assigned",
  LEAD_REASSIGNED: "lead.reassigned",
  LEAD_UNASSIGNED_ALERT: "lead.unassignedAlert",
  TEAM_OVERDUE_ALERT: "team.overdueAlert",

  // ── Registrations ─────────────────────────────────────────────────────────
  REGISTRATION_CONFIRMED: "registration.confirmed",
  REGISTRATION_CANCELLED: "registration.cancelled",
  REGISTRATION_RUN_CHANGED: "registration.runChanged",

  // ── Finance ───────────────────────────────────────────────────────────────
  BALANCE_OUTSTANDING: "balance.outstanding",
  EXPENSE_THRESHOLD_EXCEEDED: "expense.thresholdExceeded",

  // ── Attendance ────────────────────────────────────────────────────────────
  ATTENDANCE_NO_SHOW: "attendance.noShow",

  // ── Digest & misc ─────────────────────────────────────────────────────────
  DAILY_DIGEST: "daily.digest",

  // ── Deprecated — kept for backward compatibility only ────────────────────
  SESSION_NEAR_CAPACITY: "session.nearCapacity",
  SESSION_REMINDER: "session.reminder",
  SESSION_TODAY: "session.today",
  COURSE_UPDATE: "course.update",
} as const;

export type NotificationType =
  (typeof NotificationTypes)[keyof typeof NotificationTypes];

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type NotificationIntent = {
  recipientId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  scheduledAt?: Date;
  priority?: NotificationPriority;
};

export interface NotificationProvider {
  readonly name: string;
  send(intent: NotificationIntent): Promise<void>;
}
