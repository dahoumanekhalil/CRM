"use client";

import { AlertTriangle } from "lucide-react";

// Must be a client component. Renders outside the root layout, so it can't
// use any layout children — just a raw HTML page.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground font-sans antialiased">
        <div className="max-w-md space-y-5 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full border border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            <AlertTriangle className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-500">
              A critical error occurred. Please try refreshing the page.
            </p>
          </div>
          {process.env.NODE_ENV === "development" && error.message ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-start dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-mono text-gray-500 break-all">
                {error.message}
              </p>
            </div>
          ) : null}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={reset}
              className="inline-flex h-9 items-center justify-center rounded-md bg-black px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
