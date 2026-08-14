"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { BLOCK_LIST } from "@/lib/landing-blocks/registry";
import { cn } from "@/lib/utils";
import { useEditor } from "./editor-store";

export function BlockLibrary() {
  const { addBlock } = useEditor();

  return (
    <aside className="flex h-full w-full flex-col border-e border-border/70 bg-background">
      <header className="border-b border-border/70 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Blocks</h2>
        <p className="text-xs text-muted-foreground">
          Click a block to add it to the page.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {BLOCK_LIST.map((meta) => {
            const Icon = meta.icon;
            return (
              <li key={meta.type}>
                <button
                  type="button"
                  onClick={() => addBlock(meta.type)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-md p-2.5 text-start transition-colors",
                    "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                  )}
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground transition-colors group-hover:text-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {meta.label}
                      </span>
                      <Plus className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {meta.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
