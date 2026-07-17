"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type RuntimeErrorProps = {
  error: Error & { digest?: string; requestId?: string };
  reset: () => void;
  fullScreen?: boolean;
};

export function RuntimeError({ error, reset, fullScreen = false }: RuntimeErrorProps) {
  const reference = error.requestId || error.digest;
  return (
    <main className={`${fullScreen ? "min-h-[100dvh]" : "min-h-[50vh]"} flex items-center justify-center bg-[var(--color-background)] p-4 sm:p-8`}>
      <Card className="w-full min-w-0 max-w-[520px] p-5 text-center sm:p-8">
        <h1 className="text-2xl font-bold">Сталася непередбачена помилка</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Спробуйте повторити дію. Якщо проблема не зникне, передайте службі підтримки код нижче.
        </p>
        {reference ? (
          <p className="mt-4 break-all text-sm text-[var(--color-text-muted)]">
            Код: <span className="font-mono">{reference}</span>
          </p>
        ) : null}
        <div className="mt-6">
          <Button type="button" onClick={reset} className="w-full sm:w-auto">Спробувати ще раз</Button>
        </div>
      </Card>
    </main>
  );
}
