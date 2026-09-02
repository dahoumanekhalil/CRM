"use client";

import * as React from "react";
import { KanbanSquare, LayoutGrid, Table as TableIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type LeadsView = "table" | "cards" | "board";
export const LEADS_VIEWS: readonly LeadsView[] = ["table", "cards", "board"];

const VIEW_ICONS: Record<LeadsView, React.ComponentType<{ className?: string }>> = {
  table: TableIcon,
  cards: LayoutGrid,
  board: KanbanSquare,
};

const VIEW_LABELS: Record<LeadsView, string> = {
  table: "Table",
  cards: "Cards",
  board: "Board",
};

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: LeadsView;
  onChange: (view: LeadsView) => void;
}) {
  const t = useT();
  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="tablist"
        aria-label={t("View")}
        className="inline-flex items-center rounded-md border border-border/70 p-0.5"
      >
        {LEADS_VIEWS.map((view) => {
          const Icon = VIEW_ICONS[view];
          const label = t(VIEW_LABELS[view]);
          const active = value === view;
          return (
            <Tooltip key={view}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={label}
                  onClick={() => onChange(view)}
                  className={cn(
                    "inline-flex h-7 items-center justify-center rounded-sm px-2 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
