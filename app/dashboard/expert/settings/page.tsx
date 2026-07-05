import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { SettingsView } from "@/components/settings/SettingsView";

export default function ExpertSettingsPage() {
  return (
    <DashboardLayout role="expert">
      {" "}
      <div className="flex flex-col gap-[22px]">
        <Header title="Налаштування" />
        <SettingsView
          name="Коваль Олег"
          role="Експерт · Газопостачання"
          email="oleh.koval@example.com"
        />
      </div>
    </DashboardLayout>
  );
}
