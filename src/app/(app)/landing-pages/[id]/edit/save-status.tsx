"use client";

import * as React from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveStatus({
  state,
  savedAt,
  isDirty,
}: {
  state: SaveState;
  savedAt: Date | null;
  isDirty: boolean;
}) {
  // Force a re-render every 30s so the "saved 2m ago" ticker stays current.
  const [, tick] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    if (state !== "saved") return;
    const timer = setInterval(() => tick(), 30_000);
    return () => clearInterval(timer);
  }, [state]);

  let content: React.ReactNode;
  let tone: "muted" | "success" | "error" = "muted";

  if (state === "saving") {
    tone = "muted";
    content = (
      <>
        <Loader2 className="size-3.5 animate-spin" />
        Saving…
      </>
    );
  } else if (state === "error") {
    tone = "error";
    content = (
      <>
        <AlertTriangle className="size-3.5" />
        Save failed
      </>
    );
  } else if (isDirty) {
    tone = "muted";
    content = <>Unsaved changes</>;
  } else if (state === "saved" && savedAt) {
    tone = "success";
    content = (
      <>
        <Check className="size-3.5" />
        Saved {formatAgo(savedAt)}
      </>
    );
  } else {
    tone = "muted";
    content = <>All changes saved</>;
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        tone === "muted" && "text-muted-foreground",
        tone === "success" && "text-emerald-600 dark:text-emerald-500",
        tone === "error" && "text-destructive"
      )}
    >
      {content}
    </span>
  );
}

function formatAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
