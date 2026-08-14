"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps
  extends React.HTMLAttributes<HTMLButtonElement> {
  title: string;
  sortDir?: "asc" | "desc" | false;
  onToggleSort?: () => void;
}

export function DataTableColumnHeader({
  title,
  sortDir,
  onToggleSort,
  className,
  ...props
}: DataTableColumnHeaderProps) {
  if (!onToggleSort) {
    return (
      <span className={cn("text-xs font-medium uppercase tracking-wider", className)}>
        {title}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggleSort}
      className={cn(
        "-mx-2 inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      {title}
      {sortDir === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : sortDir === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-50" />
      )}
    </button>
  );
}
