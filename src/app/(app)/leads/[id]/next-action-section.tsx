"use client";

import * as React from "react";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  CalendarClock,
  Check,
  Pencil,
  Plus,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateLeadNextAction, clearLeadNextAction } from "../actions";
import type { LeadDetail } from "../actions";

type User = { id: string; name: string | null; email: string };

function toDatetimeLocal(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 16);
}

interface NextActionSectionProps {
  lead: LeadDetail;
  users: User[];
}

export function NextActionSection({ lead, users }: NextActionSectionProps) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"view" | "edit">("view");
  const [pending, startTransition] = React.useTransition();

  // Form state
  const [actionText, setActionText] = React.useState(lead.nextAction ?? "");
  const [dueDate, setDueDate] = React.useState(
    toDatetimeLocal(lead.nextActionDue)
  );
  const [ownerId, setOwnerId] = React.useState(
    lead.nextActionOwnerId ?? ""
  );

  const openEdit = () => {
    setActionText(lead.nextAction ?? "");
    setDueDate(toDatetimeLocal(lead.nextActionDue));
    setOwnerId(lead.nextActionOwnerId ?? "");
    setMode("edit");
  };

  const cancelEdit = () => setMode("view");

  const save = () => {
    if (!actionText.trim()) return;
    startTransition(async () => {
      const res = await updateLeadNextAction(lead.id, {
        nextAction: actionText,
        nextActionDue: dueDate || null,
        nextActionOwnerId: ownerId || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Next action saved");
      setMode("view");
      router.refresh();
    });
  };

  const markDone = () => {
    startTransition(async () => {
      const res = await clearLeadNextAction(lead.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Action marked done", {
        action: {
          label: "Schedule follow-up",
          onClick: () => {
            setActionText("");
            setDueDate("");
            setOwnerId(lead.ownerId ?? "");
            setMode("edit");
          },
        },
      });
      router.refresh();
    });
  };

  const hasAction = !!lead.nextAction;
  const dueDate_ = lead.nextActionDue ? new Date(lead.nextActionDue) : null;
  const isOverdue = dueDate_ && isPast(dueDate_) && !isToday(dueDate_);
  const isDueToday = dueDate_ && isToday(dueDate_);

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Next action</h2>
        {mode === "view" && (
          <div className="flex items-center gap-1.5">
            {hasAction && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={markDone}
                disabled={pending}
              >
                <Check className="size-3.5" />
                Mark done
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={openEdit}
              disabled={pending}
            >
              {hasAction ? (
                <>
                  <Pencil className="size-3.5" /> Edit
                </>
              ) : (
                <>
                  <Plus className="size-3.5" /> Schedule
                </>
              )}
            </Button>
          </div>
        )}
        {mode === "edit" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={cancelEdit}
          >
            <X className="size-4" />
          </Button>
        )}
      </header>

      {/* Body */}
      <div className="px-5 py-4">
        {mode === "view" ? (
          hasAction ? (
            <div className="space-y-2.5">
              <p className="text-sm leading-snug text-foreground">
                {lead.nextAction}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {dueDate_ && (
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium",
                      isOverdue && "text-destructive",
                      isDueToday && "text-amber-600 dark:text-amber-400",
                      !isOverdue && !isDueToday && "text-muted-foreground"
                    )}
                  >
                    <CalendarClock className="size-3.5" />
                    {isOverdue
                      ? `Overdue · ${format(dueDate_, "MMM d")}`
                      : isDueToday
                      ? `Today · ${format(dueDate_, "HH:mm")}`
                      : format(dueDate_, "MMM d · HH:mm")}
                  </span>
                )}
                {lead.nextActionOwner && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="size-3.5" />
                    {lead.nextActionOwner.name ?? lead.nextActionOwner.email}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No next action scheduled.{" "}
              <button
                type="button"
                onClick={openEdit}
                className="text-primary underline-offset-2 hover:underline"
              >
                Schedule one
              </button>{" "}
              so this lead doesn&apos;t slip through.
            </p>
          )
        ) : (
          /* Edit form */
          <div className="space-y-3">
            <Textarea
              autoFocus
              rows={2}
              placeholder="What should happen next? e.g. Call Sara about the AI course"
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              className="resize-none text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Due date</label>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Assigned to</label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger className="h-8 text-sm w-full">
                    <SelectValue placeholder="Anyone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name ?? u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEdit}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={pending || !actionText.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
