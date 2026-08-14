"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, MoreHorizontal } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { StatusBadge } from "@/components/primitives/status-badge";
import { EmptyState } from "@/components/primitives/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { courseFilters } from "./courses-filters";
import type { CourseRow } from "./actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

function formatPrice(amount: unknown, currency: string) {
  if (amount === null || amount === undefined) return "—";
  const n = typeof amount === "object" ? Number(amount.toString()) : Number(amount);
  if (Number.isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} ${currency}`;
  }
}

export function CoursesTable({
  rows,
  total,
  onNewCourse,
}: {
  rows: CourseRow[];
  total: number;
  onNewCourse: () => void;
}) {
  const [filters, setFilters] = useQueryStates(courseFilters);

  const toggleSort = (key: "createdAt" | "name" | "status" | "basePrice") => {
    setFilters((prev) => {
      if (prev.sortBy !== key) {
        return { ...prev, sortBy: key, sortDir: "asc", page: 1 };
      }
      return {
        ...prev,
        sortDir: prev.sortDir === "asc" ? "desc" : "asc",
        page: 1,
      };
    });
  };

  const sortDirFor = (key: "createdAt" | "name" | "status" | "basePrice") =>
    filters.sortBy === key ? filters.sortDir : false;

  const columns = React.useMemo<ColumnDef<CourseRow, unknown>[]>(
    () => [
      {
        id: "select",
        size: 32,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
            className="translate-y-[1px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label={`Select ${row.original.name}`}
            className="translate-y-[1px]"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: () => (
          <DataTableColumnHeader
            title="Course"
            sortDir={sortDirFor("name")}
            onToggleSort={() => toggleSort("name")}
          />
        ),
        cell: ({ row }) => (
          <Link
            href={`/courses/${row.original.slug}`}
            className="group flex min-w-0 items-start gap-3"
          >
            <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <BookOpen className="size-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="truncate text-sm font-medium leading-tight group-hover:underline">
                {row.original.name}
              </div>
              {row.original.summary ? (
                <div className="truncate text-xs text-muted-foreground leading-tight max-w-[42ch]">
                  {row.original.summary}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground/70">/{row.original.slug}</div>
              )}
            </div>
          </Link>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) =>
          row.original.category ? (
            <span className="inline-flex items-center rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
              {row.original.category}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">—</span>
          ),
      },
      {
        id: "level",
        header: "Level",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {humanize(row.original.level)}
          </span>
        ),
      },
      {
        accessorKey: "basePrice",
        header: () => (
          <DataTableColumnHeader
            title="Price"
            sortDir={sortDirFor("basePrice")}
            onToggleSort={() => toggleSort("basePrice")}
            className="text-end w-full"
          />
        ),
        cell: ({ row }) => (
          <div className="text-end text-sm tabular-nums">
            {formatPrice(row.original.basePrice, row.original.currency)}
          </div>
        ),
      },
      {
        id: "sessions",
        header: () => <span className="text-end block w-full">Sessions</span>,
        cell: ({ row }) => (
          <div className="text-end text-sm text-muted-foreground tabular-nums">
            {row.original._count?.sessions ?? 0}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <DataTableColumnHeader
            title="Status"
            sortDir={sortDirFor("status")}
            onToggleSort={() => toggleSort("status")}
          />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: () => (
          <DataTableColumnHeader
            title="Created"
            sortDir={sortDirFor("createdAt")}
            onToggleSort={() => toggleSort("createdAt")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
            {formatDistanceToNow(row.original.createdAt, { addSuffix: true })}
          </span>
        ),
      },
      {
        id: "actions",
        size: 40,
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/courses/${row.original.slug}`}>Open</Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
                <DropdownMenuItem disabled>
                  {row.original.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Create landing page</DropdownMenuItem>
                <DropdownMenuItem disabled>View students</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [filters.sortBy, filters.sortDir] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [rowSelection, setRowSelection] = React.useState({});

  const emptyState =
    filters.q || filters.status !== "ALL" || filters.level !== "ALL" ? (
      <EmptyState
        icon={BookOpen}
        title="No courses match your filters"
        description="Try clearing filters or searching for something else."
        action={
          <Button
            variant="outline"
            onClick={() =>
              setFilters({ q: "", status: "ALL", level: "ALL", page: 1 })
            }
          >
            Clear filters
          </Button>
        }
        className="border-0 bg-transparent"
      />
    ) : (
      <EmptyState
        icon={BookOpen}
        title="No courses yet"
        description="Create your first course to start scheduling sessions and building landing pages."
        action={<Button onClick={onNewCourse}>Create your first course</Button>}
        className="border-0 bg-transparent"
      />
    );

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        data={rows}
        emptyState={emptyState}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(r) => r.id}
      />
      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        totalItems={total}
        onPageChange={(p) => setFilters({ page: p })}
        onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
        selectedCount={Object.keys(rowSelection).length}
      />
    </div>
  );
}
