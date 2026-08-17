"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Info,
  Settings,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  fetchNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/app/(app)/notifications/actions";

// Compute the destination URL from the entity fields stored on the notification.
function getEntityHref(
  entityType: string | null,
  entityId: string | null
): string {
  if (!entityType || !entityId) return "/dashboard";
  switch (entityType) {
    case "Lead":
      return `/leads/${entityId}`;
    case "Task":
      return "/tasks";
    case "Payment":
      return "/payments";
    case "Course":
      return "/sessions";
    default:
      return "/dashboard";
  }
}

function dayLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function CategoryIcon({
  category,
}: {
  category: NotificationRow["category"];
}) {
  switch (category) {
    case "ACTION_REQUIRED":
      return (
        <AlertCircle className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
      );
    case "SUCCESS":
      return <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />;
    case "SYSTEM":
      return (
        <Settings className="size-4 shrink-0 text-muted-foreground" />
      );
    default:
      return <Info className="size-4 shrink-0 text-blue-500" />;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface NotificationBellProps {
  initialUnreadCount: number;
}

export function NotificationBell({
  initialUnreadCount,
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] =
    React.useState(initialUnreadCount);
  const [notifications, setNotifications] = React.useState<
    NotificationRow[]
  >([]);
  const [loading, setLoading] = React.useState(false);
  // Optimistic: track locally dismissed unread dots without waiting for server
  const [localRead, setLocalRead] = React.useState<Set<string>>(new Set());

  // Poll the unread count every 60 s when the panel is closed.
  React.useEffect(() => {
    if (open) return;
    const id = setInterval(async () => {
      const count = await getUnreadNotificationCount().catch(() => 0);
      setUnreadCount(count);
    }, 60_000);
    return () => clearInterval(id);
  }, [open]);

  // Fetch full list when the panel opens.
  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchNotifications(30)
      .then((rows) => {
        setNotifications(rows);
        setUnreadCount(rows.filter((r) => !r.read).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleMarkOne = async (n: NotificationRow) => {
    if (!n.read && !localRead.has(n.id)) {
      setLocalRead((s) => new Set(s).add(n.id));
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationRead(n.id).catch(() => {});
    }
    setOpen(false);
    router.push(getEntityHref(n.entityType, n.entityId));
  };

  const handleMarkAll = async () => {
    const unreadIds = notifications
      .filter((n) => !n.read && !localRead.has(n.id))
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    setLocalRead((s) => {
      const next = new Set(s);
      unreadIds.forEach((id) => next.add(id));
      return next;
    });
    setUnreadCount(0);
    const result = await markAllNotificationsRead().catch(() => "error");
    if (result === "error") {
      toast.error("Couldn't mark notifications as read.");
    }
  };

  // Group notifications by day label
  const grouped = React.useMemo(() => {
    const map = new Map<string, NotificationRow[]>();
    for (const n of notifications) {
      const label = dayLabel(n.createdAt);
      const arr = map.get(label) ?? [];
      arr.push(n);
      map.set(label, arr);
    }
    return Array.from(map.entries());
  }, [notifications]);

  const displayCount = Math.min(unreadCount, 9);
  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "Notifications"
          }
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span
              aria-hidden
              className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
            >
              {badgeLabel}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <div className="flex items-center gap-1">
            {displayCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleMarkAll}
              >
                Mark all read
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <ScrollArea className="max-h-[420px]">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-4 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up.
              </p>
            </div>
          ) : (
            <div>
              {grouped.map(([day, items]) => (
                <div key={day}>
                  <p className="sticky top-0 z-10 bg-popover px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {day}
                  </p>
                  <ul>
                    {items.map((n) => {
                      const isUnread = !n.read && !localRead.has(n.id);
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => handleMarkOne(n)}
                            className={cn(
                              "flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50",
                              isUnread && "bg-muted/20"
                            )}
                          >
                            <span className="mt-0.5 shrink-0">
                              <CategoryIcon category={n.category} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={cn(
                                    "truncate text-sm leading-snug",
                                    isUnread
                                      ? "font-medium text-foreground"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {n.title}
                                </p>
                                <span className="shrink-0 text-[11px] text-muted-foreground/60 tabular-nums">
                                  {formatDistanceToNow(parseISO(n.createdAt), {
                                    addSuffix: false,
                                  })}
                                </span>
                              </div>
                              {n.body ? (
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {n.body}
                                </p>
                              ) : null}
                            </div>
                            {isUnread ? (
                              <span
                                aria-label="Unread"
                                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                              />
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
