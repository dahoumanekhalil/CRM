"use client";

import * as React from "react";
import { useQueryStates } from "nuqs";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/primitives/search-input";
import { instructorFilters } from "./instructors-filters";

export function InstructorsToolbar({
  total,
  onNewInstructor,
}: {
  total: number;
  onNewInstructor: () => void;
}) {
  const [filters, setFilters] = useQueryStates(instructorFilters);
  const hasActiveFilters = filters.q !== "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 sm:max-w-lg">
          <SearchInput
            containerClassName="flex-1"
            value={filters.q}
            onChange={(v) => setFilters({ q: v, page: 1 })}
            placeholder="Search by name or email…"
          />
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ q: "", page: 1 })}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}
          <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
            {total} {total === 1 ? "instructor" : "instructors"}
          </span>
          <Button size="sm" onClick={onNewInstructor}>
            <Plus /> New instructor
          </Button>
        </div>
      </div>
    </div>
  );
}
