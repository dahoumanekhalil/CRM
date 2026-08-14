"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { MoreHorizontal, Users2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/data-table";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { EmptyState } from "@/components/primitives/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { instructorFilters } from "./instructors-filters";
import type { InstructorRow } from "./actions";

const PAGE_SIZE = 20;

function initials(first: string, last: string | null): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

export function InstructorsTable({
  rows,
  total,
  onEdit,
  onNewInstructor,
}: {
  rows: InstructorRow[];
  total: number;
  onEdit: (row: InstructorRow) => void;
  onNewInstructor: () => void;
}) {
  const [filters, setFilters] = useQueryStates(instructorFilters);

  const columns = React.useMemo<ColumnDef<InstructorRow, unknown>[]>(
    () => [
      {
        accessorKey: "firstName",
        header: "Instructor",
        cell: ({ row }) => {
          const i = row.original;
          const name = [i.firstName, i.lastName].filter(Boolean).join(" ") || "Unnamed";
          return (
            <Link
              href={`/instructors/${i.id}`}
              className="group flex min-w-0 items-center gap-3"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(i.firstName, i.lastName)}
              </span>
              <span className="truncate text-sm font-medium leading-tight group-hover:underline">
                {name}
              </span>
            </Link>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) =>
          row.original.email ? (
            <span className="truncate text-sm text-muted-foreground">
              {row.original.email}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">—</span>
          ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) =>
          row.original.phone ? (
            <span className="text-sm tabular-nums text-muted-foreground">
              {row.original.phone}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">—</span>
          ),
      },
      {
        id: "expertise",
        header: "Expertise",
        cell: ({ row }) => {
          const tags = row.original.expertise;
          if (!tags || tags.length === 0) {
            return <span className="text-xs text-muted-foreground/60">—</span>;
          }
          const visible = tags.slice(0, 2);
          const rest = tags.length - 2;
          return (
            <div className="flex flex-wrap items-center gap-1">
              {visible.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-1.5 py-0 text-[10px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
              {rest > 0 ? (
                <span className="text-[10px] text-muted-foreground">+{rest}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "courses",
        header: () => <span className="block w-full text-end">Courses</span>,
        cell: ({ row }) => (
          <div className="text-end text-sm tabular-nums">
            {row.original._count.courses}
          </div>
        ),
      },
      {
        id: "sessions",
        header: () => <span className="block w-full text-end">Sessions</span>,
        cell: ({ row }) => (
          <div className="text-end text-sm tabular-nums text-muted-foreground">
            {row.original._count.sessions}
          </div>
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
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(row.original)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/instructors/${row.original.id}`}>View profile</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [onEdit]
  );

  const emptyState = filters.q ? (
    <EmptyState
      icon={Users2}
      title="No instructors match your search"
      description="Try a different name or email, or clear the search."
      action={
        <Button variant="outline" onClick={() => setFilters({ q: "", page: 1 })}>
          Clear search
        </Button>
      }
      className="border-0 bg-transparent"
    />
  ) : (
    <EmptyState
      icon={Users2}
      title="No instructors yet"
      description="Add your first instructor to assign them to courses and sessions."
      action={<Button onClick={onNewInstructor}>Add first instructor</Button>}
      className="border-0 bg-transparent"
    />
  );

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        data={rows}
        emptyState={emptyState}
        getRowId={(r) => r.id}
      />
      <DataTablePagination
        page={filters.page}
        pageSize={PAGE_SIZE}
        totalItems={total}
        onPageChange={(p) => setFilters({ page: p })}
        selectedCount={0}
      />
    </div>
  );
}
