"use client";

import * as React from "react";
import { Columns3, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n/use-t";

export type ColumnVisibilityOption = {
  id: string;
  label: string;
  // Columns marked required stay in the menu but can't be hidden — used for
  // things like the select checkbox and the row-actions kebab.
  required?: boolean;
};

export function ColumnVisibilityMenu({
  columns,
  visibility,
  onChange,
  onReset,
}: {
  columns: ColumnVisibilityOption[];
  visibility: Record<string, boolean>;
  onChange: (id: string, visible: boolean) => void;
  onReset?: () => void;
}) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="size-3.5" /> {t("Columns")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t("Toggle columns")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={visibility[col.id] !== false}
            disabled={col.required}
            onCheckedChange={(v) => onChange(col.id, !!v)}
            onSelect={(e) => e.preventDefault()}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
        {onReset ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onReset}>
              <RotateCcw className="size-3.5" /> {t("Reset to defaults")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
