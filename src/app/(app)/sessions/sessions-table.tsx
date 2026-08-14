"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { format } from "date-fns";
import {
  CalendarDays,
  ClipboardCheck,
  MapPin,
  MoreHorizontal,
  Pencil,
  UserPlus,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { StatusBadge } from "@/components/primitives/status-badge";
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

import { sessionFilters } from "./sessions-filters";
import type { SessionRow } from "./actions";

// Same day → single date. Cross day → "Mar 15 – Mar 17" (or with year if different).
export function formatSessionDates(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) return format(start, "MMM d, yyyy");
  const sameYear = start.getFullYear() === end.getFullYear();
  const endFmt = sameYear ? "MMM d" : "MMM d, yyyy";
  return `${format(start, "MMM d")} – ${format(end, endFmt)}`;
}

export function formatSessionTime(start: Date, end: Date): string {
  return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
}

export function SessionsTable({
  rows,
  total,
  onNewSession,
  onEditSession,
  onRegisterStudent,
  onTakeAttendance,
}: {
  rows: SessionRow[];
  total: number;
  onNewSession: () => void;
  onEditSession: (session: SessionRow) => void;
  onRegisterStudent: (session: SessionRow) => void;
  onTakeAttendance: (session: SessionRow) => void;
}) {
  const [filters, setFilters] = useQueryStates(sessionFilters);

  const toggleSort = (key: "startDate" | "createdAt" | "status") => {
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

  const sortDirFor = (key: "startDate" | "createdAt" | "status") =>
    filters.sortBy === key ? filters.sortDir : false;

  const columns = React.useMemo<ColumnDef<SessionRow, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Session",
        cell: ({ row }) => {
          const s = row.original;
          const label = s.title?.trim() || s.course.name;
          return (
            <div className="min-w-0 space-y-0.5">
              <div className="truncate text-sm font-medium leading-tight">
                {label}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                <Link
                  href={`/courses/${s.course.slug}`}
                  className="hover:underline"
                >
                  {s.course.name}
                </Link>
              </div>
            </div>
          );
        },
      },
      {
        id: "when",
        header: () => (
          <DataTableColumnHeader
            title="When"
            sortDir={sortDirFor("startDate")}
            onToggleSort={() => toggleSort("startDate")}
          />
        ),
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex items-start gap-2 text-sm">
              <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 space-y-0.5">
                <div className="whitespace-nowrap tabular-nums">
                  {formatSessionDates(s.startDate, s.endDate)}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatSessionTime(s.startDate, s.endDate)}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "location",
        header: "Where",
        cell: ({ row }) => {
          const s = row.original;
          const parts = [s.city, s.country].filter(Boolean).join(", ");
          if (!parts && !s.location) {
            return <span className="text-xs text-muted-foreground/60">—</span>;
          }
          return (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 space-y-0.5">
                {parts ? (
                  <div className="truncate">{parts}</div>
                ) : null}
                {s.location ? (
                  <div className="truncate text-xs text-muted-foreground">
                    {s.location}
                  </div>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "seats",
        header: () => <span className="block w-full text-end">Seats</span>,
        cell: ({ row }) => {
          const s = row.original;
          const filled = s._count.registrations;
          const pct = s.capacity > 0 ? (filled / s.capacity) * 100 : 0;
          return (
            <div className="text-end text-sm tabular-nums">
              <span className="font-medium">{filled}</span>
              <span className="text-muted-foreground">/{s.capacity}</span>
              {pct >= 100 ? (
                <span className="ms-1.5 text-xs text-warning">Full</span>
              ) : null}
            </div>
          );
        },
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
                <DropdownMenuItem onClick={() => onRegisterStudent(row.original)}>
                  <UserPlus /> Register student
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onTakeAttendance(row.original)}
                  disabled={row.original._count.registrations === 0}
                >
                  <ClipboardCheck /> Take attendance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditSession(row.original)}>
                  <Pencil /> Edit session
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/courses/${row.original.course.slug}`}>
                    Open course
                  </Link>
                </DropdownMenuItem>
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
    filters.q ||
    filters.status !== "ALL" ||
    filters.courseId !== "" ||
    filters.when !== "ALL" ? (
      <EmptyState
        icon={CalendarDays}
        title="No sessions match your filters"
        description="Try clearing filters or picking a different course."
        action={
          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                q: "",
                status: "ALL",
                courseId: "",
                when: "ALL",
                page: 1,
              })
            }
          >
            Clear filters
          </Button>
        }
        className="border-0 bg-transparent"
      />
    ) : (
      <EmptyState
        icon={CalendarDays}
        title="No sessions yet"
        description="Sessions are scheduled instances of a course that students register for."
        action={<Button onClick={onNewSession}>Create your first session</Button>}
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
        pageSize={filters.pageSize}
        totalItems={total}
        onPageChange={(p) => setFilters({ page: p })}
        onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
        selectedCount={0}
      />
    </div>
  );
}
