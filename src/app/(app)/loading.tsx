import { Skeleton } from "@/components/ui/skeleton";

// Shown by Next.js during server-component navigation inside the (app) shell.
// The sidebar stays mounted (React Server Components stream the new page in);
// this placeholder fills the content area until data is ready.
export default function AppLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Mimics a PageHeader */}
      <div className="space-y-2 border-b border-border/60 pb-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      {/* Mimics a table or card grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-0"
            >
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
