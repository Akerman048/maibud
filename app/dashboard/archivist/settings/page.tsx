import { UserRole } from "@/app/generated/prisma/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { EmailNotificationSettings } from "@/components/settings/EmailNotificationSettings";
import { SettingsView } from "@/components/settings/SettingsView";
import { getEmailSettings } from "@/lib/email/settings-data";
import { requireDashboardRole } from "@/lib/require-dashboard-role";

export default async function ArchivistSettingsPage() {
  const user = await requireDashboardRole(UserRole.ARCHIVIST);
  const emailSettings = await getEmailSettings(user.id);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header title="Налаштування" />
        <SettingsView
          name={user.name ?? ""}
          role={user.role}
          email={user.email ?? ""}
        />
        <EmailNotificationSettings settings={emailSettings} />
      </div>
    </DashboardLayout>
  );
}
