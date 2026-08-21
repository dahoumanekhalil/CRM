"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { formatDistanceToNow } from "date-fns";
import { GraduationCap, Mail, MoreHorizontal, Phone } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { calcPaymentStatus } from "@/lib/payment-status";
import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
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

import { studentFilters } from "./students-filters";
import type { StudentRow } from "./actions";

function initials(first: string, last: string | null): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

export function StudentsTable({
  rows,
  total,
  onNewStudent,
}: {
  rows: StudentRow[];
  total: number;
  onNewStudent: () => void;
}) {
  const [filters, setFilters] = useQueryStates(studentFilters);

  const toggleSort = (key: "createdAt" | "firstName" | "lastName") => {
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

  const sortDirFor = (key: "createdAt" | "firstName" | "lastName") =>
    filters.sortBy === key ? filters.sortDir : false;

  const columns = React.useMemo<ColumnDef<StudentRow, unknown>[]>(
    () => [
      {
        accessorKey: "firstName",
        header: () => (
          <DataTableColumnHeader
            title="Student"
            sortDir={sortDirFor("firstName")}
            onToggleSort={() => toggleSort("firstName")}
          />
        ),
        cell: ({ row }) => {
          const s = row.original;
          const name = [s.firstName, s.lastName].filter(Boolean).join(" ") || "Unnamed";
          const payDot = calcPaymentStatus(
            (s as Record<string, unknown>).registrations as Parameters<typeof calcPaymentStatus>[0]
          );
          return (
            <Link
              href={`/students/${s.id}`}
              className="group flex min-w-0 items-center gap-3"
            >
              <div className="relative shrink-0">
                <span className={cn(
                  "grid size-9 place-items-center rounded-full text-xs font-semibold",
                  payDot === "none"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                    : "bg-primary/10 text-primary"
                )}>
                  {initials(s.firstName, s.lastName)}
                </span>
                {payDot === "full" && (
                  <span className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-background bg-green-500" title="Fully paid" />
                )}
                {payDot === "partial" && (
                  <span className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-background bg-blue-500" title="Partially paid" />
                )}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="truncate text-sm font-medium leading-tight group-hover:underline">
                  {name}
                </div>
                {s.tags && s.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {s.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-1.5 py-0 text-[10px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                    {s.tags.length > 3 ? (
                      <span className="text-[10px] text-muted-foreground">
                        +{s.tags.length - 3}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Link>
          );
        },
      },
      {
        id: "contact",
        header: "Contact",
        cell: ({ row }) => {
          const s = row.original;
          if (!s.email && !s.phone) {
            return <span className="text-xs text-muted-foreground/60">—</span>;
          }
          return (
            <div className="space-y-0.5 text-sm">
              {s.email ? (
                <div className="flex items-center gap-1.5 truncate text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{s.email}</span>
                </div>
              ) : null}
              {s.phone ? (
                <div className="flex items-center gap-1.5 truncate text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  <span className="truncate tabular-nums">{s.phone}</span>
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "registrations",
        header: () => <span className="block w-full text-end">Registrations</span>,
        cell: ({ row }) => (
          <div className="text-end text-sm tabular-nums">
            {row.original._count.registrations}
          </div>
        ),
      },
      {
        id: "payments",
        header: () => <span className="block w-full text-end">Payments</span>,
        cell: ({ row }) => (
          <div className="text-end text-sm tabular-nums text-muted-foreground">
            {row.original._count.payments}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: () => (
          <DataTableColumnHeader
            title="Joined"
            sortDir={sortDirFor("createdAt")}
            onToggleSort={() => toggleSort("createdAt")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
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
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/students/${row.original.id}`}>Open</Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Register for course</DropdownMenuItem>
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

  const emptyState =
    filters.q || filters.tag ? (
      <EmptyState
        icon={GraduationCap}
        title="No students match your filters"
        description="Try searching for something else, or clear filters."
        action={
          <Button
            variant="outline"
            onClick={() => setFilters({ q: "", tag: "", page: 1 })}
          >
            Clear filters
          </Button>
        }
        className="border-0 bg-transparent"
      />
    ) : (
      <EmptyState
        icon={GraduationCap}
        title="No students yet"
        description="Students appear here once you add them or convert a lead."
        action={<Button onClick={onNewStudent}>Add your first student</Button>}
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
        getRowClassName={(row) => {
          const payDot = calcPaymentStatus(
            (row as Record<string, unknown>).registrations as Parameters<typeof calcPaymentStatus>[0]
          );
          return payDot === "none" && row._count.registrations > 0
            ? "bg-red-50/50 dark:bg-red-950/15"
            : "";
        }}
      />
      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        totalItems={total}
        onPageChange={(p) => setFilters({ page: p })}
        onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
        selectedCount={0}
      />
    </div>
  );
}
