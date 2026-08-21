import { Skeleton } from "@/components/ui/skeleton";

export default function MyLeadsLoading() {
  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border/60 px-6 py-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-48 max-w-full" />
        </div>
      </header>

      <div className="flex-1 p-6 max-w-2xl space-y-8">
        {/* Zone — Today */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="space-y-2 ps-7">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-16 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Zone — New Leads */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="space-y-2 ps-7">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-3 w-14 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Zone — Pipeline */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="ps-7">
            <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 border-b border-border/40 last:border-0"
                >
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
