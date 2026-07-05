import { Skeleton } from "@/components/ui/Skeleton";

export function ProjectsSkeleton() {
  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex items-center justify-between gap-5">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>

        <Skeleton className="h-10 w-[280px]" />
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white">
        <div className="grid grid-cols-4 gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>

        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-4 items-center gap-4 border-b border-slate-100 px-5 py-5 last:border-b-0"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-32" />
            </div>

            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}