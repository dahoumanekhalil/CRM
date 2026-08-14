"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { Plus, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Client-side filtering (on top of server data) for instant feel
  const filtered = React.useMemo(() => {
    let r = rows;
    if (q.trim()) {
      const lower = q.toLowerCase();
      r = r.filter((t) => t.title.toLowerCase().includes(lower));
    }
    return r;
  }, [rows, q]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Preset tabs */}
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

        {/* Search */}
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

      {/* Table */}
      <TasksTable
        rows={filtered}
        total={total}
        onEdit={(task) => {
          setEditingTask(task);
          setSheetOpen(false);
        }}
      />

      {/* Create sheet */}
      <TaskSheet
        open={sheetOpen && !editOpen}
        onOpenChange={setSheetOpen}
        users={users}
      />

      {/* Edit sheet */}
      <TaskSheet
        open={editOpen}
        onOpenChange={(open) => { if (!open) closeEdit(); }}
        task={editingTask}
        users={users}
      />
    </>
  );
}
