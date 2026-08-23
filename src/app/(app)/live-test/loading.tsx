import { Skeleton } from "@/components/ui/skeleton";

export default function LiveTestLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Icon placeholder */}
        <div className="flex justify-center">
          <Skeleton className="size-14 rounded-2xl" />
        </div>
        {/* Title + subtitle */}
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-7 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
        {/* Room input */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        {/* Join button */}
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
