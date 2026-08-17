export default function SalesLoading() {
  return (
    <div className="flex-1 p-6 space-y-8 animate-pulse">
      {/* KPI strip skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/50" />
        ))}
      </div>
      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="h-96 rounded-xl bg-muted/50" />
        <div className="h-96 rounded-xl bg-muted/50" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-muted/50" />
        <div className="h-64 rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}
