import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type SettingsViewProps = {
  name: string;
  role: string;
  email: string;
};

export function SettingsView({ name, role, email }: SettingsViewProps) {
  return (
    <Card className="max-w-2xl p-6">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold">Профіль користувача</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Основна інформація про акаунт
          </p>
        </div>

        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Імʼя</label>
            <Input defaultValue={name} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Роль</label>
            <Input defaultValue={role} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Email</label>
            <Input defaultValue={email} />
          </div>
        </div>

        <div>
          <Button>Зберегти зміни</Button>
        </div>
      </div>
    </Card>
  );
}