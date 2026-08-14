"use client";

import * as React from "react";
import { useQueryStates } from "nuqs";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/primitives/search-input";

import { studentFilters } from "./students-filters";
import { exportStudentsCsv } from "./export";
import { CsvExportButton } from "@/components/primitives/csv-export-button";

export function StudentsToolbar({
  total,
  onNewStudent,
}: {
  total: number;
  onNewStudent: () => void;
}) {
  const [filters, setFilters] = useQueryStates(studentFilters);

  const hasActiveFilters = filters.q !== "" || filters.tag !== "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 sm:max-w-lg">
          <SearchInput
            containerClassName="flex-1"
            value={filters.q}
            onChange={(v) => setFilters({ q: v, page: 1 })}
            placeholder="Search by name, email or phone…"
          />
          {filters.tag ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs">
              tag: <strong>{filters.tag}</strong>
              <button
                type="button"
                aria-label="Clear tag filter"
                onClick={() => setFilters({ tag: "", page: 1 })}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ q: "", tag: "", page: 1 })}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}
          <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
            {total} {total === 1 ? "student" : "students"}
          </span>
          <CsvExportButton
            label="Export"
            onExport={() =>
              exportStudentsCsv({
                q: filters.q || undefined,
                tag: filters.tag || undefined,
              })
            }
          />
          <Button size="sm" onClick={onNewStudent}>
            <Plus /> New student
          </Button>
        </div>
      </div>
    </div>
  );
}
