import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-8">
      <Card className="max-w-[480px] p-8 text-center">
        <div className="text-sm font-semibold text-[var(--color-text-muted)]">
          404
        </div>

        <h1 className="mt-2 text-2xl font-bold">
          Сторінку не знайдено
        </h1>

        <p className="mt-2 text-[var(--color-text-secondary)]">
          Схоже, ця сторінка не існує або посилання було змінено.
        </p>

        <div className="mt-6">
          <Button asChild>
            <Link href="/dashboard/head">
              Повернутися в dashboard
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}