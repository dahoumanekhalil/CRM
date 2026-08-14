import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border/60 px-6 py-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </header>

      <div className="flex-1 space-y-4 p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-80 rounded-lg" />
          <Skeleton className="h-9 w-48 rounded-md" />
          <div className="ms-auto">
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="flex items-center gap-4 border-b border-border/60 px-4 py-2.5">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-0"
            >
              <Skeleton className="size-6 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="size-7 rounded-md" />
            </div>
          ))}
          <div className="px-4 py-2">
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </>
  );
}
