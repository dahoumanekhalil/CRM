import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Page header */}
      <div className="border-b border-border/60 px-6 py-6">
        <Skeleton className="mb-2 h-3.5 w-24" />
        <Skeleton className="mb-2 h-7 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Telegram section */}
          <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </div>

          {/* Preferences section */}
          <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
