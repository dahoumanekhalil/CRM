"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    className?: string;
    // Human label used by the column visibility menu when the header itself
    // isn't a plain string (e.g. it renders a sortable button or an icon).
    label?: string;
  }
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  // Controlled server-side sorting (URL-backed).
  sorting?: SortingState;
  onSortingChange?: React.Dispatch<React.SetStateAction<SortingState>>;
  // Row selection.
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  // Column visibility.
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: React.Dispatch<React.SetStateAction<VisibilityState>>;
  getRowId?: (row: TData) => string;
  getRowClassName?: (row: TData) => string | undefined;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  emptyState,
  onRowClick,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,
  getRowId,
  getRowClassName,
  className,
}: DataTableProps<TData, TValue>) {
  // Only include state fields that are actually controlled. Passing
  // `{ rowSelection: undefined }` makes TanStack treat selection as controlled
  // with an undefined value, which crashes when it later does `state.rowSelection[rowId]`.
  const state: {
    sorting?: SortingState;
    rowSelection?: RowSelectionState;
    columnVisibility?: VisibilityState;
  } = {};
  if (sorting !== undefined) state.sorting = sorting;
  if (rowSelection !== undefined) state.rowSelection = rowSelection;
  if (columnVisibility !== undefined) state.columnVisibility = columnVisibility;

  const table = useReactTable({
    data,
    columns,
    state,
    onSortingChange,
    onRowSelectionChange,
    onColumnVisibilityChange,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
    enableRowSelection: !!onRowSelectionChange,
  });

  const hasRows = table.getRowModel().rows?.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-card overflow-x-auto",
        className
      )}
    >
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="hover:bg-transparent border-border/70"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "h-11 bg-muted/40 text-xs font-medium uppercase tracking-wider text-muted-foreground",
                    header.column.columnDef.meta?.className
                  )}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`sk-${i}`} className="border-border/60">
                {columns.map((_c, j) => (
                  <TableCell key={j} className={cn(_c.meta?.className)}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : hasRows ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={() => onRowClick?.(row.original)}
                className={cn(
                  "border-border/60",
                  onRowClick && "cursor-pointer",
                  getRowClassName?.(row.original)
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cn("py-3", cell.column.columnDef.meta?.className)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                {emptyState ?? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No results.
                  </div>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
