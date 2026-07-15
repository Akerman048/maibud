import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectsSkeleton } from "@/components/projects/ProjectsSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function HeadLoading() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>

        <ProjectsSkeleton />
      </div>
    </DashboardLayout>
  );
}