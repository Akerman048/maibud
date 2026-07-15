import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectsSkeleton } from "@/components/projects/ProjectsSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ExpertLoading() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>

        <ProjectsSkeleton />
      </div>
    </DashboardLayout>
  );
}