"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/data-table";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { EmptyState } from "@/components/primitives/empty-state";
import { SearchInput } from "@/components/primitives/search-input";

import type { CustomerRow, CustomersResult } from "./actions";

function initials(first: string, last: string | null): string {
  const a = first[0] ?? "";
  const b = last?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

function formatTotalPaid(totalPaid: CustomerRow["totalPaid"]): string {
  if (totalPaid.length === 0) return "—";
  return totalPaid
    .map((t) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: t.currency,
        maximumFractionDigits: 0,
      }).format(t.amount)
    )
    .join(" + ");
}

const columns: ColumnDef<CustomerRow, unknown>[] = [
  {
    accessorKey: "firstName",
    header: "Customer",
    cell: ({ row }) => {
      const s = row.original;
      const name =
        [s.firstName, s.lastName].filter(Boolean).join(" ") || "Unnamed";
      return (
        <Link
          href={`/students/${s.id}`}
          className="group flex min-w-0 items-center gap-3"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {initials(s.firstName, s.lastName)}
          </span>
          <div className="min-w-0 space-y-0.5">
            <div className="truncate text-sm font-medium leading-tight group-hover:underline">
              {name}
            </div>
            {s.email ? (
              <div className="truncate text-xs text-muted-foreground">
                {s.email}
              </div>
            ) : null}
          </div>
        </Link>
      );
    },
  },
  {
    id: "totalPaid",
    header: () => <span className="block w-full text-end">Total paid</span>,
    cell: ({ row }) => (
      <div className="text-end text-sm font-medium tabular-nums">
        {formatTotalPaid(row.original.totalPaid)}
      </div>
    ),
  },
  {
    id: "paymentsCount",
    header: () => <span className="block w-full text-end">Payments</span>,
    cell: ({ row }) => (
      <div className="text-end">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
          {row.original.paymentsCount}
        </span>
      </div>
    ),
  },
  {
    id: "registrationsCount",
    header: () => <span className="block w-full text-end">Registrations</span>,
    cell: ({ row }) => (
      <div className="text-end">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
          {row.original.registrationsCount}
        </span>
      </div>
    ),
  },
  {
    id: "lastPaymentAt",
    header: "Last payment",
    cell: ({ row }) => {
      const d = row.original.lastPaymentAt;
      if (!d) return <span className="text-xs text-muted-foreground/60">—</span>;
      return (
        <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
          {formatDistanceToNow(d, { addSuffix: true })}
        </span>
      );
    },
  },
  {
    id: "phone",
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
];

export function CustomersClient({
  initialData,
}: {
  initialData: CustomersResult;
}) {
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  const filtered = React.useMemo(() => {
    if (!q.trim()) return initialData.rows;
    const term = q.trim().toLowerCase();
    return initialData.rows.filter((r) => {
      const name = `${r.firstName} ${r.lastName ?? ""}`.toLowerCase();
      return (
        name.includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.phone?.includes(term)
      );
    });
  }, [initialData.rows, q]);

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSearch = (value: string) => {
    setQ(value);
    setPage(1);
  };

  const emptyState = q ? (
    <EmptyState
      icon={Users}
      title="No customers match your search"
      description="Try searching for a different name, email, or phone number."
      className="border-0 bg-transparent"
    />
  ) : (
    <EmptyState
      icon={Users}
      title="No customers yet"
      description="Customers appear here once a student makes their first payment."
      className="border-0 bg-transparent"
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SearchInput
          containerClassName="w-full max-w-sm"
          value={q}
          onChange={handleSearch}
          placeholder="Search by name, email or phone…"
        />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {total} {total === 1 ? "customer" : "customers"}
        </span>
      </div>
      <div className="space-y-2">
        <DataTable
          columns={columns}
          data={paginated}
          emptyState={emptyState}
          getRowId={(r) => r.id}
        />
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          selectedCount={0}
        />
      </div>
    </div>
  );
}
