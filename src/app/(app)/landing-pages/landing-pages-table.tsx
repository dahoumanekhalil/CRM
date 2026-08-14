"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Globe,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Trash2,
  UploadCloud,
  Archive,
  RotateCcw,
} from "lucide-react";
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

import { landingPageFilters } from "./landing-pages-filters";
import type { LandingPageRow } from "./actions";
import {
  deleteLandingPage,
  setLandingPageStatus,
} from "./actions";

export function LandingPagesTable({
  rows,
  total,
}: {
  rows: LandingPageRow[];
  total: number;
}) {
  const router = useRouter();
  const [filters, setFilters] = useQueryStates(landingPageFilters);
  const [rowSelection, setRowSelection] = React.useState({});
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const toggleSort = (key: "updatedAt" | "title" | "status") => {
    setFilters((prev) => {
      if (prev.sortBy !== key) return { ...prev, sortBy: key, sortDir: "asc", page: 1 };
      return { ...prev, sortDir: prev.sortDir === "asc" ? "desc" : "asc", page: 1 };
    });
  };
  const sortDirFor = (key: "updatedAt" | "title" | "status") =>
    filters.sortBy === key ? filters.sortDir : false;

  const onSetStatus = async (
    id: string,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  ) => {
    setPendingId(id);
    const res = await setLandingPageStatus(id, status);
    setPendingId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      status === "PUBLISHED"
        ? "Page published"
        : status === "ARCHIVED"
        ? "Page archived"
        : "Page unpublished"
    );
    router.refresh();
  };

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setPendingId(id);
    const res = await deleteLandingPage(id);
    setPendingId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Page deleted");
    router.refresh();
  };

  const columns = React.useMemo<ColumnDef<LandingPageRow, unknown>[]>(
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
            aria-label={`Select ${row.original.title}`}
            className="translate-y-[1px]"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "title",
        header: () => (
          <DataTableColumnHeader
            title="Page"
            sortDir={sortDirFor("title")}
            onToggleSort={() => toggleSort("title")}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Globe className="size-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="truncate text-sm font-medium leading-tight">
                {row.original.title}
              </div>
              <div className="truncate text-xs text-muted-foreground leading-tight">
                /p/{row.original.slug}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "course",
        header: "Course",
        cell: ({ row }) =>
          row.original.course ? (
            <Link
              href={`/courses/${row.original.course.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {row.original.course.name}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground/60">—</span>
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
        accessorKey: "updatedAt",
        header: () => (
          <DataTableColumnHeader
            title="Updated"
            sortDir={sortDirFor("updatedAt")}
            onToggleSort={() => toggleSort("updatedAt")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
            {formatDistanceToNow(row.original.updatedAt, { addSuffix: true })}
          </span>
        ),
      },
      {
        id: "actions",
        size: 40,
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const isPending = pendingId === row.original.id;
          const isPublished = row.original.status === "PUBLISHED";
          const isArchived = row.original.status === "ARCHIVED";
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={isPending}
                  >
                    <MoreHorizontal />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/landing-pages/${row.original.id}/edit`}>
                      <Pencil /> Open in editor
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={`/p/${row.original.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink /> View public
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isPublished ? (
                    <DropdownMenuItem
                      onClick={() => onSetStatus(row.original.id, "DRAFT")}
                    >
                      <RotateCcw /> Unpublish
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onSetStatus(row.original.id, "PUBLISHED")}
                    >
                      <UploadCloud /> Publish
                    </DropdownMenuItem>
                  )}
                  {!isArchived ? (
                    <DropdownMenuItem
                      onClick={() => onSetStatus(row.original.id, "ARCHIVED")}
                    >
                      <Archive /> Archive
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onSetStatus(row.original.id, "DRAFT")}
                    >
                      <RotateCcw /> Restore to draft
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(row.original.id, row.original.title)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [filters.sortBy, filters.sortDir, pendingId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const emptyState =
    filters.q || filters.status !== "ALL" ? (
      <EmptyState
        icon={Globe}
        title="No landing pages match your filters"
        description="Try clearing filters or searching for something else."
        action={
          <Button
            variant="outline"
            onClick={() => setFilters({ q: "", status: "ALL", page: 1 })}
          >
            Clear filters
          </Button>
        }
        className="border-0 bg-transparent"
      />
    ) : (
      <EmptyState
        icon={Globe}
        title="No landing pages yet"
        description="Create a page for a course to start receiving registrations."
        action={
          <Button asChild>
            <Link href="/landing-pages/new">Create landing page</Link>
          </Button>
        }
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
