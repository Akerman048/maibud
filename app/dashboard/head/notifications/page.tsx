import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export default function HeadNotificationsPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header title="Сповіщення" subtitle="3 нові події" />
        <NotificationsView />
      </div>
    </DashboardLayout>
  );
}