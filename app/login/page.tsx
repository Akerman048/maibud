import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-8">
      <div className="flex w-full max-w-[440px] flex-col gap-7">
        <div className="flex items-center justify-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[11px] bg-[var(--color-accent)] text-[22px] font-bold text-white">
            E
          </div>

          <div className="text-2xl font-bold tracking-[-0.01em]">
            ExpertDesk
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-9 shadow-[var(--shadow-md)]">
          <h1 className="text-[22px] font-semibold">Вхід</h1>

          <p className="mt-1 mb-7 text-[15px] text-[var(--color-text-secondary)]">
            Увійдіть до робочого простору вашої організації
          </p>

          <form className="flex flex-col gap-[18px]">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                Електронна пошта
              </label>

              <Input
                type="email"
                defaultValue="olena.kovalchuk@ukr.net"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Пароль
                </label>

                <a
                  href="#"
                  className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
                >
                  Забули пароль?
                </a>
              </div>

              <Input type="password" defaultValue="123456789" />
            </div>

            <Button type="submit" className="mt-2 w-full">
              Увійти
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}