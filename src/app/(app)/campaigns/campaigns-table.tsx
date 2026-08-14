"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { format, formatDistanceToNow } from "date-fns";
import { Megaphone, MoreHorizontal, Pencil } from "lucide-react";
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

import { campaignFilters } from "./campaigns-filters";
import type { CampaignRow } from "./actions";

function formatBudget(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat().format(amount);
}

function dateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return "—";
  if (start && !end) return `From ${format(start, "MMM d, yyyy")}`;
  if (!start && end) return `Until ${format(end, "MMM d, yyyy")}`;
  return `${format(start!, "MMM d")} → ${format(end!, "MMM d, yyyy")}`;
}

export function CampaignsTable({
  rows,
  total,
  onNewCampaign,
  onEditCampaign,
}: {
  rows: CampaignRow[];
  total: number;
  onNewCampaign: () => void;
  onEditCampaign: (campaign: CampaignRow) => void;
}) {
  const [filters, setFilters] = useQueryStates(campaignFilters);

  const toggleSort = (
    key: "createdAt" | "name" | "status" | "startDate"
  ) => {
    setFilters((prev) => {
      if (prev.sortBy !== key) {
        return { ...prev, sortBy: key, sortDir: "desc", page: 1 };
      }
      return {
        ...prev,
        sortDir: prev.sortDir === "asc" ? "desc" : "asc",
        page: 1,
      };
    });
  };

  const sortDirFor = (key: "createdAt" | "name" | "status" | "startDate") =>
    filters.sortBy === key ? filters.sortDir : false;

  const columns = React.useMemo<ColumnDef<CampaignRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => (
          <DataTableColumnHeader
            title="Campaign"
            sortDir={sortDirFor("name")}
            onToggleSort={() => toggleSort("name")}
          />
        ),
        cell: ({ row }) => (
          <Link
            href={`/campaigns/${row.original.id}`}
            className="group flex min-w-0 items-start gap-3"
          >
            <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Megaphone className="size-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="truncate text-sm font-medium leading-tight group-hover:underline">
                {row.original.name}
              </div>
              {row.original.source ? (
                <div className="truncate text-xs text-muted-foreground">
                  {row.original.source}
                </div>
              ) : null}
            </div>
          </Link>
        ),
      },
      {
        id: "leads",
        header: () => <span className="block w-full text-end">Leads</span>,
        cell: ({ row }) => (
          <div className="text-end text-sm tabular-nums">
            {row.original._count.leads}
          </div>
        ),
      },
      {
        id: "budget",
        header: () => <span className="block w-full text-end">Budget</span>,
        cell: ({ row }) => (
          <div className="text-end text-sm tabular-nums text-muted-foreground">
            {formatBudget(row.original.budget)}
          </div>
        ),
      },
      {
        id: "schedule",
        header: () => (
          <DataTableColumnHeader
            title="Schedule"
            sortDir={sortDirFor("startDate")}
            onToggleSort={() => toggleSort("startDate")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
            {dateRange(row.original.startDate, row.original.endDate)}
          </span>
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
          <span className="whitespace-nowrap text-xs text-muted-foreground">
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
                  <Link href={`/campaigns/${row.original.id}`}>Open</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditCampaign(row.original)}>
                  <Pencil /> Edit
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
    filters.q || filters.status !== "ALL" ? (
      <EmptyState
        icon={Megaphone}
        title="No campaigns match your filters"
        description="Try clearing filters or picking a different status."
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
        icon={Megaphone}
        title="No campaigns yet"
        description="Group leads by the marketing activity that generated them — LinkedIn ads, newsletters, referrals."
        action={<Button onClick={onNewCampaign}>Create your first campaign</Button>}
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
