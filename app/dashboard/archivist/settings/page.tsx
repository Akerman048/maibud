import { UserRole } from "@/app/generated/prisma/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { SettingsView } from "@/components/settings/SettingsView";
import { requireDashboardRole } from "@/lib/require-dashboard-role";

export default async function ArchivistSettingsPage() {
  const user = await requireDashboardRole(UserRole.ARCHIVIST);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header title="Налаштування" />
        <SettingsView
          name={user.name ?? ""}
          role={user.role}
          email={user.email ?? ""}
        />
      </div>
    </DashboardLayout>
  );
}
