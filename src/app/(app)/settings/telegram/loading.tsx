import { Skeleton } from "@/components/ui/skeleton";

export default function TelegramAdminLoading() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Page header */}
      <div className="border-b border-border/60 px-6 py-6">
        <Skeleton className="mb-2 h-3.5 w-32" />
        <Skeleton className="mb-2 h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="flex-1 px-6 py-6 space-y-4">
        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-44" />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
          <div className="border-b border-border/70 bg-muted/40 px-4 py-3">
            <Skeleton className="h-3 w-80" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border/60 px-4 py-3.5 last:border-0"
            >
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
