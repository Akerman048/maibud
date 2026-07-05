import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function PublicProjectNotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-8">
      <Card className="max-w-[520px] p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex size-11 items-center justify-center rounded-[11px] bg-[var(--color-accent)] text-[22px] font-bold text-white">
            E
          </div>
        </div>

        <h1 className="text-2xl font-bold">
          Проєкт не знайдено
        </h1>

        <p className="mt-2 text-[var(--color-text-secondary)]">
          Можливо, посилання більше не активне або проєкт було видалено.
        </p>

        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link href="/project/inactive">
              Перейти до сторінки неактивного посилання
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}