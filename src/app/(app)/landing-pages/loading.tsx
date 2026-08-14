import { Skeleton } from "@/components/ui/skeleton";

export default function LandingPagesLoading() {
  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border/60 px-6 py-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </header>

      <div className="flex-1 space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-56 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <div className="ms-auto">
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="flex items-center gap-4 border-b border-border/60 px-4 py-2.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-20 ms-auto" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-0">
              <div className="flex-1 space-y-1 min-w-0">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-1">
                <Skeleton className="h-7 w-16 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
