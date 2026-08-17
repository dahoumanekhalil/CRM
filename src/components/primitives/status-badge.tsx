import * as React from "react";
import { cn } from "@/lib/utils";

type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "brand";

const toneStyles: Record<StatusTone, string> = {
  neutral:
    "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  info:
    "bg-info/10 text-info ring-1 ring-inset ring-info/20",
  success:
    "bg-success/10 text-success ring-1 ring-inset ring-success/20",
  warning:
    "bg-warning/15 text-warning ring-1 ring-inset ring-warning/25",
  danger:
    "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
  brand:
    "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
};

// Shared status → tone mapping across the app (see DESIGN.md §30).
export const statusTone: Record<string, StatusTone> = {
  // Leads
  NEW: "info",
  CONTACTED: "brand",
  INTERESTED: "brand",
  FOLLOW_UP: "warning",
  REGISTERED: "success",
  LOST: "neutral",
  NOT_INTERESTED: "neutral",
  UNREACHABLE: "danger",
  // Payment aggregate statuses
  UNPAID: "danger",
  PARTIALLY_PAID: "warning",
  FULLY_PAID: "success",

  // Courses / sessions
  DRAFT: "neutral",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
  UPCOMING: "info",
  OPEN: "brand",
  FULL: "warning",
  IN_PROGRESS: "brand",
  COMPLETED: "success",
  CANCELLED: "danger",

  // Registrations (CONFIRMED covers both lead "confirmed" and registration "confirmed")
  PENDING: "warning",
  CONFIRMED: "brand",
  ATTENDING: "brand",
  NO_SHOW: "danger",

  // Payments
  FAILED: "danger",
  REFUNDED: "neutral",

  // Attendance
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  EXCUSED: "neutral",

  // Campaigns
  ACTIVE: "success",
  PAUSED: "warning",

  // Telegram connection
  CONNECTED: "success",
  DISABLED: "neutral",
  REVOKED: "neutral",
  BLOCKED: "danger",
  ERROR: "danger",
};

interface StatusBadgeProps {
  status: string;
  tone?: StatusTone;
  className?: string;
}

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function StatusBadge({ status, tone, className }: StatusBadgeProps) {
  const resolved = tone ?? statusTone[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        toneStyles[resolved],
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-current opacity-70",
          resolved === "neutral" && "opacity-40"
        )}
      />
      {humanize(status)}
    </span>
  );
}
