// All valid notification types across the system.
// Add new types here — business modules reference these constants, never raw strings.
export const NotificationTypes = {
  TASK_ASSIGNED: "task.assigned",
  TASK_REMINDER: "task.reminder",
  TASK_OVERDUE: "task.overdue",
  SESSION_NEAR_CAPACITY: "session.nearCapacity",
  SESSION_REMINDER: "session.reminder",
  COURSE_UPDATE: "course.update",
  PAYMENT_PENDING: "payment.pending",
  LEAD_ASSIGNED: "lead.assigned",
  DAILY_DIGEST: "daily.digest",
} as const;

export type NotificationType =
  (typeof NotificationTypes)[keyof typeof NotificationTypes];

export type NotificationIntent = {
  recipientId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  scheduledAt?: Date;
};

export interface NotificationProvider {
  readonly name: string;
  send(intent: NotificationIntent): Promise<void>;
}
