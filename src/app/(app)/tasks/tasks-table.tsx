"use client";

import * as React from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  Check,
  CheckSquare,
  Circle,
  MoreHorizontal,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toggleTaskComplete, deleteTask } from "./actions";
import type { TaskRow } from "./actions";
import { useRouter } from "next/navigation";

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: "border-destructive/30 bg-destructive/10 text-destructive",
  HIGH: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  NORMAL: "border-border bg-muted/50 text-muted-foreground",
  LOW: "border-border/50 bg-transparent text-muted-foreground/60",
};

const STATUS_BADGE: Record<string, string> = {
  TODO: "border-border bg-muted/50 text-foreground",
  IN_PROGRESS: "border-primary/30 bg-primary/10 text-primary",
  COMPLETED: "border-border/40 bg-muted/30 text-muted-foreground line-through",
  CANCELLED: "border-border/30 bg-muted/20 text-muted-foreground/50",
};

const humanize = (s: string) =>
  s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const ENTITY_HREFS: Record<string, string> = {
  Lead: "/leads",
  Student: "/students",
  Course: "/courses",
  Session: "/sessions",
  Payment: "/payments",
  Campaign: "/campaigns",
  LandingPage: "/landing-pages",
};

function DueDateCell({ iso, status }: { iso: string | null; status: string }) {
  if (!iso) return <span className="text-muted-foreground/50">—</span>;
  const d = parseISO(iso);
  const done = status === "COMPLETED" || status === "CANCELLED";
  const overdue = !done && isPast(d) && !isToday(d);
  const today = !done && isToday(d);
  return (
    <span
      className={cn(
        "text-sm tabular-nums",
        overdue && "font-medium text-destructive",
        today && "font-medium text-amber-600 dark:text-amber-400",
        done && "text-muted-foreground/50"
      )}
    >
      {isToday(d) ? "Today" : format(d, "MMM d, yyyy")}
      {" "}
      {format(d, "HH:mm")}
    </span>
  );
}

function CompleteButton({
  task,
  onDone,
}: {
  task: TaskRow;
  onDone: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const isDone = task.status === "COMPLETED";

  const toggle = () => {
    startTransition(async () => {
      const res = await toggleTaskComplete(task.id, task.status);
      if (!res.ok) toast.error(res.error);
      else onDone();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || task.status === "CANCELLED"}
      title={isDone ? "Reopen task" : "Mark complete"}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
        isDone
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/80"
          : "border-border bg-background text-transparent hover:border-primary hover:text-primary",
        "disabled:cursor-not-allowed disabled:opacity-40"
      )}
    >
      {isDone ? <RotateCcw className="size-3" /> : <Check className="size-3" />}
    </button>
  );
}

function RowActions({
  task,
  onEdit,
  onDeleted,
}: {
  task: TaskRow;
  onEdit: (t: TaskRow) => void;
  onDeleted: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Task deleted");
        setDeleteOpen(false);
        onDeleted();
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-7">
            <MoreHorizontal className="size-4" />
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{task.title}&rdquo; will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pending}
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

export function TasksTable({
  rows,
  total,
  onEdit,
}: {
  rows: TaskRow[];
  total: number;
  onEdit: (task: TaskRow) => void;
}) {
  const router = useRouter();

  const columns: ColumnDef<TaskRow>[] = [
    {
      id: "complete",
      header: "",
      size: 32,
      cell: ({ row }) => (
        <CompleteButton task={row.original} onDone={() => router.refresh()} />
      ),
    },
    {
      accessorKey: "title",
      header: "Task",
      cell: ({ row }) => {
        const t = row.original;
        const entityHref = t.entityType && t.entityId
          ? `${ENTITY_HREFS[t.entityType] ?? ""}/${t.entityId}`
          : null;

        return (
          <div className="min-w-0 space-y-0.5">
            <p
              className={cn(
                "text-sm font-medium leading-tight",
                (t.status === "COMPLETED" || t.status === "CANCELLED") &&
                  "line-through text-muted-foreground"
              )}
            >
              {t.title}
            </p>
            {entityHref && (
              <Link
                href={entityHref}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Circle className="size-1.5 fill-current" />
                {t.entityType}
              </Link>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      size: 100,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn("text-xs", PRIORITY_BADGE[row.original.priority])}
        >
          {humanize(row.original.priority)}
        </Badge>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      size: 140,
      cell: ({ row }) => (
        <DueDateCell iso={row.original.dueDate} status={row.original.status} />
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 110,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn("text-xs", STATUS_BADGE[row.original.status])}
        >
          {humanize(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: "owner",
      header: "Owner",
      size: 130,
      cell: ({ row }) => {
        const o = row.original.owner;
        if (!o) return <span className="text-muted-foreground/50">—</span>;
        return (
          <span className="text-sm text-muted-foreground">
            {o.name ?? o.email}
          </span>
        );
      },
    },
    {
      id: "actions",
      size: 40,
      cell: ({ row }) => (
        <RowActions
          task={row.original}
          onEdit={onEdit}
          onDeleted={() => router.refresh()}
        />
      ),
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No tasks"
        description="Tasks you create or tasks assigned to you will appear here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  style={{ width: h.getSize() !== 150 ? h.getSize() : undefined }}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
        {total} task{total !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
