import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignsLoading() {
  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border/60 px-6 py-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </header>

      <div className="flex-1 space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-56 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <div className="ms-auto">
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-1 text-center">
                    <Skeleton className="h-5 w-12 mx-auto" />
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 flex-1 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
