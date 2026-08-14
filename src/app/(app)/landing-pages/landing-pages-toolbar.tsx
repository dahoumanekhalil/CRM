"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/primitives/search-input";
import { cn } from "@/lib/utils";

import { landingPageFilters } from "./landing-pages-filters";
import { LANDING_PAGE_STATUSES } from "@/lib/schemas/landing-page";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const STATUS_TABS = [
  { value: "ALL" as const, label: "All" },
  ...LANDING_PAGE_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
];

export function LandingPagesToolbar({ total }: { total: number }) {
  const [filters, setFilters] = useQueryStates(landingPageFilters);
  const hasActiveFilters = filters.q !== "" || filters.status !== "ALL";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 sm:max-w-md">
          <SearchInput
            value={filters.q}
            onChange={(v) => setFilters({ q: v, page: 1 })}
            placeholder="Search pages by title, course, URL…"
          />
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ q: "", status: "ALL", page: 1 })}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href="/landing-pages/new">
              <Plus /> New landing page
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_TABS.map((tab) => {
          const active = filters.status === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilters({ status: tab.value, page: 1 })}
              className={cn(
                "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.value === "ALL" ? (
                <span className="ms-1.5 opacity-70 tabular-nums">{total}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
