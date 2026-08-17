"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Check, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleTaskComplete } from "@/app/(app)/tasks/actions";
import type { PriorityTask } from "./workday";

export function PriorityTasksCard({ tasks }: { tasks: PriorityTask[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<Set<string>>(new Set());
  // Optimistically hide rows after marking done, before router.refresh() settles
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());

  const markDone = async (task: PriorityTask) => {
    setPending((s) => new Set(s).add(task.id));
    const result = await toggleTaskComplete(task.id, task.status);
    setPending((s) => {
      const next = new Set(s);
      next.delete(task.id);
      return next;
    });
    if (result.ok) {
      setDismissed((s) => new Set(s).add(task.id));
      toast.success("Task marked as done");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const visible = tasks.filter((t) => !dismissed.has(t.id));

  if (visible.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-4 py-3.5 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
        No tasks due today or overdue.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
      {visible.map((task) => {
        const due = task.dueDate ? parseISO(task.dueDate) : null;
        const isPending = pending.has(task.id);
        return (
          <li key={task.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{task.title}</p>
              {due ? (
                <p
                  className={cn(
                    "mt-0.5 flex items-center gap-1 text-xs",
                    task.isOverdue
                      ? "text-destructive"
                      : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  <Clock className="size-3 shrink-0" />
                  {task.isOverdue
                    ? `Overdue · ${format(due, "MMM d")}`
                    : "Due today"}
                </p>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={isPending}
              onClick={() => markDone(task)}
            >
              <Check className="size-3.5" />
              Mark done
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
