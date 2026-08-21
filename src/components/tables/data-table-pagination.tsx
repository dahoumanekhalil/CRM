"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n/use-t";

interface DataTablePaginationProps {
  page: number; // 1-indexed
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  selectedCount?: number;
}

export function DataTablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  selectedCount = 0,
}: DataTablePaginationProps) {
  const t = useT();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return (
    <div className="flex flex-col-reverse items-start justify-between gap-3 px-1 pt-4 sm:flex-row sm:items-center">
      <div className="text-xs text-muted-foreground tabular-nums">
        {selectedCount > 0 ? (
          <>
            <span className="font-medium text-foreground">{selectedCount}</span>{" "}
            {t("selected of")} {totalItems.toLocaleString()}
          </>
        ) : (
          <>
            {t("Showing")} <span className="font-medium text-foreground">{start.toLocaleString()}</span>–
            <span className="font-medium text-foreground">{end.toLocaleString()}</span> {t("of")}{" "}
            <span className="font-medium text-foreground">{totalItems.toLocaleString()}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-xs text-muted-foreground">{t("Rows per page")}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger size="sm" className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="text-xs text-muted-foreground tabular-nums">
          {t("Page")} {page} / {totalPages}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(1)}
            disabled={!canPrev}
            aria-label="First page"
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
            aria-label="Last page"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
