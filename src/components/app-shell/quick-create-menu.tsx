"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterCommands, type UserRole } from "./command-menu-registry";

interface QuickCreateMenuProps {
  open: boolean;
  onClose: () => void;
  userRole?: string;
}

export function QuickCreateMenu({ open, onClose, userRole }: QuickCreateMenuProps) {
  const router = useRouter();

  const items = React.useMemo(
    () => filterCommands(userRole as UserRole | undefined).filter((c) => c.group === "create"),
    [userRole]
  );

  const navigate = React.useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  // Number keys 1–9 trigger the nth item; Escape closes.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= items.length) {
        const item = items[n - 1];
        if (item) navigate(item.href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, navigate, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — click outside to close */}
      <div
        className="fixed inset-0 z-50"
        aria-hidden
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Quick create"
        aria-modal="true"
        className="fixed start-1/2 top-1/2 z-50 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 animate-in fade-in-0 zoom-in-95 duration-150 rounded-2xl border border-border/70 bg-card shadow-2xl shadow-black/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Quick create</p>
            <p className="text-xs text-muted-foreground">Press a number key to jump</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Items */}
        <ul className="p-1.5">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const n = idx + 1;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-accent"
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/50 text-[11px] font-semibold text-muted-foreground group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {n}
                  </span>
                  <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border/70 bg-muted px-1 font-mono text-[10px]">
              C
            </kbd>
            to open ·
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border/70 bg-muted px-1 font-mono text-[10px]">
              Esc
            </kbd>
            to close
          </span>
        </div>
      </div>
    </>
  );
}
