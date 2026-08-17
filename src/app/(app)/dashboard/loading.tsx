import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex-1">
      {/* Greeting skeleton */}
      <header className="border-b border-border/60 px-6 py-8">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </header>

      <div className="space-y-10 px-6 py-8">
        {/* Attention center skeleton */}
        <section>
          <Skeleton className="mb-3 h-3 w-24" />
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </section>

        {/* Today's schedule skeleton */}
        <section>
          <Skeleton className="mb-3 h-3 w-28" />
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="size-4 shrink-0 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3 w-28 shrink-0" />
              </div>
            ))}
          </div>
        </section>

        {/* Priority tasks skeleton */}
        <section>
          <Skeleton className="mb-3 h-3 w-24" />
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
              </div>
            ))}
          </div>
        </section>

        {/* Business overview skeleton */}
        <section className="space-y-6">
          <Skeleton className="h-3 w-32" />

          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="space-y-4 rounded-xl border border-border/60 bg-card px-5 py-5"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="size-4 rounded" />
                </div>
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-3 w-36" />
              </div>
            ))}
          </div>

          {/* Charts row 1 */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card lg:col-span-3">
              <div className="flex items-baseline justify-between px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="px-2 pb-3">
                <Skeleton className="h-[220px] w-full rounded-md" />
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card lg:col-span-2">
              <div className="flex items-baseline justify-between px-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="px-2 pb-3">
                <Skeleton className="h-[220px] w-full rounded-md" />
              </div>
            </div>
          </div>

          {/* Charts row 2 + sessions */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card lg:col-span-3">
              <div className="flex items-baseline justify-between px-4 py-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="px-2 pb-3">
                <Skeleton className="h-[220px] w-full rounded-md" />
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-12" />
              </div>
              <ul className="divide-y divide-border/60">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-3">
                    <Skeleton className="mt-0.5 size-8 shrink-0 rounded-md" />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
