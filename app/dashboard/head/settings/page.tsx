import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { SettingsView } from "@/components/settings/SettingsView";

export default function HeadSettingsPage() {
  return (
    <DashboardLayout role="head">
      <div className="flex flex-col gap-[22px]">
        <Header title="Налаштування" />

        <SettingsView
          name="Петренко Сергій"
          role="Начальник експертизи"
          email="serhii.petrenko@example.com"
        />
      </div>
    </DashboardLayout>
  );
}