"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { Plus } from "lucide-react";
import { parseISO, isPast, isToday, isFuture } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { TaskSheet } from "./task-sheet";
import { TasksTable } from "./tasks-table";
import type { TaskRow, UserPickerItem } from "./actions";

const newParam = parseAsString
  .withOptions({ clearOnDefault: true })
  .withDefault("");

const PRESETS = [
  { value: "all", label: "All tasks" },
  { value: "mine", label: "My tasks" },
  { value: "today", label: "Due today" },
  { value: "overdue", label: "Overdue" },
  { value: "no-date", label: "No due date" },
] as const;

type Preset = (typeof PRESETS)[number]["value"];

// Group tasks by time horizon for the "All" view.
function groupTasks(rows: TaskRow[]) {
  const active = rows.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"
  );
  const done = rows.filter((t) => t.status === "COMPLETED");

  const overdue: TaskRow[] = [];
  const today: TaskRow[] = [];
  const upcoming: TaskRow[] = [];
  const noDate: TaskRow[] = [];

  for (const t of active) {
    if (!t.dueDate) {
      noDate.push(t);
    } else {
      const d = parseISO(t.dueDate);
      if (isToday(d)) today.push(t);
      else if (isPast(d)) overdue.push(t);
      else upcoming.push(t);
    }
  }

  return { overdue, today, upcoming, noDate, done };
}

export function TasksClient({
  rows,
  total,
  users,
}: {
  rows: TaskRow[];
  total: number;
  users: UserPickerItem[];
}) {
  const [rawNew, setRawNew] = useQueryState("new", newParam);
  const sheetOpen = rawNew === "1";
  const setSheetOpen = (open: boolean) =>
    void setRawNew(open ? "1" : "", { scroll: false });

  const [editingTask, setEditingTask] = React.useState<TaskRow | undefined>();
  const editOpen = !!editingTask;
  const closeEdit = () => setEditingTask(undefined);

  const openNew = () => {
    setEditingTask(undefined);
    setSheetOpen(true);
  };

  const [preset, setPreset] = React.useState<Preset>("all");
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!q.trim()) return rows;
    const lower = q.toLowerCase();
    return rows.filter((t) => t.title.toLowerCase().includes(lower));
  }, [rows, q]);

  const groups = React.useMemo(
    () => (preset === "all" ? groupTasks(filtered) : null),
    [preset, filtered]
  );

  const handleEdit = (task: TaskRow) => {
    setEditingTask(task);
    setSheetOpen(false);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPreset(p.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                preset === p.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Input
          placeholder="Search tasks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 w-52"
        />

        <Button size="sm" onClick={openNew} className="ms-auto">
          <Plus />
          New task
        </Button>
      </div>

      {/* Grouped view (All preset) */}
      {groups ? (
        <GroupedView groups={groups} total={total} onEdit={handleEdit} />
      ) : (
        <TasksTable rows={filtered} total={total} onEdit={handleEdit} />
      )}

      {/* Create sheet */}
      <TaskSheet
        open={sheetOpen && !editOpen}
        onOpenChange={setSheetOpen}
        users={users}
      />

      {/* Edit sheet */}
      <TaskSheet
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
        task={editingTask}
        users={users}
      />
    </>
  );
}

function GroupedView({
  groups,
  total,
  onEdit,
}: {
  groups: ReturnType<typeof groupTasks>;
  total: number;
  onEdit: (t: TaskRow) => void;
}) {
  const { overdue, today, upcoming, noDate, done } = groups;
  const isEmpty =
    overdue.length === 0 &&
    today.length === 0 &&
    upcoming.length === 0 &&
    noDate.length === 0 &&
    done.length === 0;

  if (isEmpty) {
    return (
      <TasksTable rows={[]} total={0} onEdit={onEdit} />
    );
  }

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <TaskGroup
          label="Overdue"
          count={overdue.length}
          labelClassName="text-destructive"
          rows={overdue}
          onEdit={onEdit}
        />
      )}
      {today.length > 0 && (
        <TaskGroup
          label="Today"
          count={today.length}
          labelClassName="text-amber-600 dark:text-amber-400"
          rows={today}
          onEdit={onEdit}
        />
      )}
      {upcoming.length > 0 && (
        <TaskGroup label="Upcoming" count={upcoming.length} rows={upcoming} onEdit={onEdit} />
      )}
      {noDate.length > 0 && (
        <TaskGroup label="No due date" count={noDate.length} rows={noDate} onEdit={onEdit} />
      )}
      {done.length > 0 && (
        <TaskGroup label="Completed" count={done.length} rows={done} onEdit={onEdit} />
      )}
      <p className="text-xs text-muted-foreground">
        {total} task{total !== 1 ? "s" : ""} total
      </p>
    </div>
  );
}

function TaskGroup({
  label,
  count,
  rows,
  onEdit,
  labelClassName,
}: {
  label: string;
  count: number;
  rows: TaskRow[];
  onEdit: (t: TaskRow) => void;
  labelClassName?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            labelClassName ?? "text-muted-foreground"
          )}
        >
          {label}
        </h2>
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      <TasksTable rows={rows} total={count} onEdit={onEdit} />
    </div>
  );
}
