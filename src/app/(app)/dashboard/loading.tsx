import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <>
      {/* PageHeader skeleton */}
      <header className="flex flex-col gap-4 border-b border-border/60 px-6 py-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </header>

      <div className="flex-1 space-y-6 p-6">
        {/* KPI row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card px-5 py-5 space-y-4">
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
        </section>

        {/* Charts row 1 */}
        <section className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 overflow-hidden rounded-xl border border-border/60 bg-card">
            <div className="flex items-baseline justify-between px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="px-2 pb-3">
              <Skeleton className="h-[220px] w-full rounded-md" />
            </div>
          </div>
          <div className="lg:col-span-2 overflow-hidden rounded-xl border border-border/60 bg-card">
            <div className="flex items-baseline justify-between px-4 py-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="px-2 pb-3">
              <Skeleton className="h-[220px] w-full rounded-md" />
            </div>
          </div>
        </section>

        {/* Charts row 2 + sessions */}
        <section className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 overflow-hidden rounded-xl border border-border/60 bg-card">
            <div className="flex items-baseline justify-between px-4 py-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="px-2 pb-3">
              <Skeleton className="h-[220px] w-full rounded-md" />
            </div>
          </div>
          <div className="lg:col-span-2 overflow-hidden rounded-xl border border-border/60 bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <ul className="divide-y divide-border/60">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <Skeleton className="mt-0.5 size-8 rounded-md shrink-0" />
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
        </section>
      </div>
    </>
  );
}
