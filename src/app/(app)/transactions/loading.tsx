import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border/60 px-6 py-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </header>

      <div className="flex-1 space-y-6 p-6">
        {/* Summary stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card px-5 py-5 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-56 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
            <div className="ms-auto">
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <div className="flex items-center gap-4 border-b border-border/60 px-4 py-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-32 ms-auto" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-0">
                <Skeleton className="h-4 w-20" />
                <div className="flex items-center gap-3 flex-1 min-w-0 ms-auto">
                  <Skeleton className="size-7 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
