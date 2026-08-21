"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { format, formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Pencil, Wallet } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { useT } from "@/lib/i18n/use-t";
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

import { paymentFilters } from "./payments-filters";
import type { PaymentRow } from "./actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function PaymentsTable({
  rows,
  total,
  onNewPayment,
  onEditPayment,
}: {
  rows: PaymentRow[];
  total: number;
  onNewPayment: () => void;
  onEditPayment: (payment: PaymentRow) => void;
}) {
  const t = useT();
  const [filters, setFilters] = useQueryStates(paymentFilters);

  const toggleSort = (key: "createdAt" | "paidAt" | "amount" | "status") => {
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

  const sortDirFor = (key: "createdAt" | "paidAt" | "amount" | "status") =>
    filters.sortBy === key ? filters.sortDir : false;

  const columns = React.useMemo<ColumnDef<PaymentRow, unknown>[]>(
    () => [
      {
        id: "student",
        header: () => t("Student"),
        cell: ({ row }) => {
          const s = row.original.student;
          const name = [s.firstName, s.lastName].filter(Boolean).join(" ") ||
            s.email ||
            "Unnamed";
          return (
            <div className="min-w-0 space-y-0.5">
              <Link
                href={`/students/${s.id}`}
                className="truncate text-sm font-medium hover:underline"
              >
                {name}
              </Link>
              {row.original.registration?.session ? (
                <Link
                  href={`/courses/${row.original.registration.session.course.slug}`}
                  className="block truncate text-xs text-muted-foreground hover:underline"
                >
                  {row.original.registration.session.course.name}
                  {row.original.registration.session.title
                    ? ` · ${row.original.registration.session.title}`
                    : ""}
                </Link>
              ) : (
                <div className="text-xs text-muted-foreground/70">
                  {t("No linked session")}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: () => (
          <DataTableColumnHeader
            title={t("Amount")}
            sortDir={sortDirFor("amount")}
            onToggleSort={() => toggleSort("amount")}
            className="text-end w-full"
          />
        ),
        cell: ({ row }) => (
          <div className="text-end text-sm tabular-nums">
            {formatMoney(row.original.amount, row.original.currency)}
          </div>
        ),
      },
      {
        id: "method",
        header: () => t("Method"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {humanize(row.original.method)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <DataTableColumnHeader
            title={t("Status")}
            sortDir={sortDirFor("status")}
            onToggleSort={() => toggleSort("status")}
          />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "paidAt",
        header: () => (
          <DataTableColumnHeader
            title={t("Paid")}
            sortDir={sortDirFor("paidAt")}
            onToggleSort={() => toggleSort("paidAt")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {row.original.paidAt
              ? format(row.original.paidAt, "MMM d, yyyy")
              : "—"}
          </span>
        ),
      },
      {
        id: "reference",
        header: () => t("Reference"),
        cell: ({ row }) => (
          <span className="truncate font-mono text-xs text-muted-foreground">
            {row.original.reference ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: () => (
          <DataTableColumnHeader
            title={t("Recorded")}
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
                <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEditPayment(row.original)}>
                  <Pencil /> {t("Edit")}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/students/${row.original.student.id}?tab=payments`}>
                    {t("Open student")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled
                  className="text-destructive focus:text-destructive"
                >
                  {t("Delete")}
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
    filters.method !== "ALL" ||
    filters.studentId !== "" ? (
      <EmptyState
        icon={Wallet}
        title={t("No payments match your filters")}
        description={t("Try clearing filters or picking a different status.")}
        action={
          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                q: "",
                status: "ALL",
                method: "ALL",
                studentId: "",
                page: 1,
              })
            }
          >
            {t("Clear filters")}
          </Button>
        }
        className="border-0 bg-transparent"
      />
    ) : (
      <EmptyState
        icon={Wallet}
        title={t("No payments yet")}
        description={t("Payments appear here once you record cash, card, transfer or online payments from students.")}
        action={<Button onClick={onNewPayment}>{t("Record your first payment")}</Button>}
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
