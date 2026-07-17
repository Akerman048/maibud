import { Skeleton } from "@/components/ui/Skeleton";

export function ProjectsSkeleton() {
  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center">
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Skeleton className="h-11 w-full sm:w-20" />
          <Skeleton className="h-11 w-full sm:w-24" />
          <Skeleton className="h-11 w-full sm:w-32" />
          <Skeleton className="h-11 w-full sm:w-28" />
        </div>

        <Skeleton className="h-11 w-full sm:w-[280px]" />
      </div>

      <div className="grid gap-4 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white md:block">
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
