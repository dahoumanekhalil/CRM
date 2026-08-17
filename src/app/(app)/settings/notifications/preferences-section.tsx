"use client";

import * as React from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { setNotificationPreference, type PreferencesRecord } from "./actions";
import type { NotificationType } from "@/lib/notifications/types";

// ── Group definitions — matches DESIGN.md §C4 spec exactly ───────────────────

interface PrefItem {
  type: NotificationType;
  label: string;
}

interface PrefGroup {
  label: string;
  items: PrefItem[];
}

const PREFERENCE_GROUPS: PrefGroup[] = [
  {
    label: "Tasks",
    items: [
      { type: "task.reminder", label: "Task reminders (30 min before due)" },
      { type: "task.overdue", label: "Overdue task alert (daily at 09:00)" },
    ],
  },
  {
    label: "Courses",
    items: [
      { type: "session.reminder", label: "Session reminders (1 hour before)" },
      { type: "course.update", label: "Course updates" },
    ],
  },
  {
    label: "Payments",
    items: [{ type: "payment.pending", label: "Payment pending alert" }],
  },
  {
    label: "Leads",
    items: [{ type: "lead.assigned", label: "New lead assigned to me" }],
  },
  {
    label: "System",
    items: [{ type: "daily.digest", label: "Daily digest" }],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function PreferencesSection({
  initialPreferences,
  connected,
}: {
  initialPreferences: PreferencesRecord;
  connected: boolean;
}) {
  const [prefs, setPrefs] = React.useState<PreferencesRecord>(initialPreferences);
  const [saving, setSaving] = React.useState<Partial<Record<NotificationType, true>>>({});

  const handleToggle = async (type: NotificationType, next: boolean) => {
    // Optimistic update
    setPrefs((p) => ({ ...p, [type]: next }));
    setSaving((s) => ({ ...s, [type]: true }));

    const res = await setNotificationPreference(type, next);

    setSaving((s) => {
      const { [type]: _, ...rest } = s;
      return rest as typeof s;
    });

    if (!res.ok) {
      // Revert on failure
      setPrefs((p) => ({ ...p, [type]: !next }));
      toast.error(res.error);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Telegram Notifications</h2>
          <p className="text-xs text-muted-foreground">
            {connected
              ? "Choose which notifications you receive in Telegram."
              : "Connect Telegram above to activate these notifications."}
          </p>
        </div>
      </div>

      <div className={cn("space-y-5", !connected && "opacity-60 pointer-events-none")}>
        {PREFERENCE_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="mb-4 border-t border-border/40" />}
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const enabled = prefs[item.type] ?? false;
                const isSaving = !!saving[item.type];
                return (
                  <label
                    key={item.type}
                    className="flex cursor-pointer items-center justify-between rounded-md px-1 py-2 transition-colors hover:bg-muted/50"
                  >
                    <span className="text-sm text-foreground/90">{item.label}</span>
                    <Switch
                      size="sm"
                      checked={enabled}
                      disabled={isSaving || !connected}
                      onCheckedChange={(next) => handleToggle(item.type, next)}
                      aria-label={item.label}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
