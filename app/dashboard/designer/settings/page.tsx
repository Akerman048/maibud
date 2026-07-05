import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { SettingsView } from "@/components/settings/SettingsView";

export default function ExpertSettingsPage() {
  return (
    <DashboardLayout role="designer">
      <div className="flex flex-col gap-[22px]">
        <Header title="Налаштування" />
        <SettingsView
  name="Романенко Павло"
  role="Проєктувальник · ТОВ «Проєктбуд»"
  email="pavlo.romanenko@example.com"
/>
      </div>
    </DashboardLayout>
  );
}
