"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Catches unexpected runtime errors inside the (app) route group.
// Shows inside the app shell so the sidebar remains navigable.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-md space-y-5 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Your data is safe — this page just
            couldn&apos;t load.
          </p>
        </div>
        {process.env.NODE_ENV === "development" && error.message ? (
          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-start">
            <p className="text-xs font-mono text-muted-foreground break-all">
              {error.message}
            </p>
            {error.digest ? (
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                Digest: {error.digest}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
