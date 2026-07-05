import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export default function ArchivistNotificationsPage() {
  return (
    <DashboardLayout role="archivist">
      <div className="flex flex-col gap-[22px]">
        <Header title="Сповіщення" subtitle="4 нові події архіву" />
        <NotificationsView />
      </div>
    </DashboardLayout>
  );
}