"use client";

import * as React from "react";
import Link from "next/link";
import { format, isPast, isToday, parseISO } from "date-fns";
import { Check, CheckSquare, Circle, MoreHorizontal, Plus, Trash2, RotateCcw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/primitives/empty-state";
import { cn } from "@/lib/utils";
import { toggleTaskComplete, deleteTask } from "@/app/(app)/tasks/actions";
import { TaskSheet } from "@/app/(app)/tasks/task-sheet";
import type { TaskRow, UserPickerItem } from "@/app/(app)/tasks/actions";

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: "border-destructive/30 bg-destructive/10 text-destructive",
  HIGH: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  NORMAL: "border-border bg-muted/50 text-muted-foreground",
  LOW: "border-border/50 bg-transparent text-muted-foreground/60",
};

const humanize = (s: string) =>
  s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function TaskItem({
  task,
  onEdit,
}: {
  task: TaskRow;
  onEdit: (t: TaskRow) => void;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [completePending, startComplete] = React.useTransition();
  const [deletePending, startDelete] = React.useTransition();

  const isDone = task.status === "COMPLETED";

  const handleToggle = () => {
    startComplete(async () => {
      const res = await toggleTaskComplete(task.id, task.status);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      const res = await deleteTask(task.id);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Task deleted");
        setDeleteOpen(false);
        router.refresh();
      }
    });
  };

  const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
  const overdue = dueDate && !isDone && isPast(dueDate) && !isToday(dueDate);
  const dueToday = dueDate && !isDone && isToday(dueDate);

  return (
    <>
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40",
          isDone && "opacity-60"
        )}
      >
        {/* Complete toggle */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={completePending || task.status === "CANCELLED"}
          title={isDone ? "Reopen" : "Mark complete"}
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
            isDone
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-transparent hover:border-primary hover:text-primary",
            "disabled:cursor-not-allowed disabled:opacity-40"
          )}
        >
          {isDone ? (
            <RotateCcw className="size-2.5" />
          ) : (
            <Check className="size-2.5" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0", PRIORITY_BADGE[task.priority])}
            >
              {humanize(task.priority)}
            </Badge>
            {dueDate && (
              <span
                className={cn(
                  "text-xs",
                  overdue && "text-destructive font-medium",
                  dueToday && "text-amber-600 dark:text-amber-400 font-medium",
                  !overdue && !dueToday && "text-muted-foreground"
                )}
              >
                {dueToday ? "Today" : overdue ? "Overdue" : "Due"}{" "}
                {format(dueDate, "MMM d")}
              </span>
            )}
            {task.owner && (
              <span className="text-xs text-muted-foreground">
                {task.owner.name ?? task.owner.email}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="size-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{task.title}&rdquo; will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface TasksTabProps {
  tasks: TaskRow[];
  users: UserPickerItem[];
  entityType: string;
  entityId: string;
  entityLabel?: string;
}

export function TasksTab({
  tasks,
  users,
  entityType,
  entityId,
  entityLabel,
}: TasksTabProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskRow | undefined>();

  const openNew = () => {
    setEditingTask(undefined);
    setSheetOpen(true);
  };

  const openEdit = (task: TaskRow) => {
    setEditingTask(task);
    setSheetOpen(true);
  };

  const openTasks = tasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"
  );
  const doneTasks = tasks.filter(
    (t) => t.status === "COMPLETED" || t.status === "CANCELLED"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Tasks</h2>
          <p className="text-xs text-muted-foreground">
            {openTasks.length} open · {doneTasks.length} done
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus />
          Add task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Create a task to track the next action for this record."
          action={
            <Button size="sm" onClick={openNew}>
              <Plus />
              Add task
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
          {openTasks.map((t) => (
            <div key={t.id} className="group">
              <TaskItem task={t} onEdit={openEdit} />
            </div>
          ))}
          {doneTasks.length > 0 && openTasks.length > 0 && (
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/20">
              Completed
            </div>
          )}
          {doneTasks.map((t) => (
            <div key={t.id} className="group">
              <TaskItem task={t} onEdit={openEdit} />
            </div>
          ))}
        </div>
      )}

      <TaskSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        task={editingTask}
        users={users}
        defaultEntityType={editingTask ? undefined : entityType}
        defaultEntityId={editingTask ? undefined : entityId}
        defaultEntityLabel={editingTask ? undefined : entityLabel}
      />
    </div>
  );
}
