"use client";

import { useActionState } from "react";
import Link from "next/link";

import { acceptInvitation } from "@/app/invite/[token]/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AcceptInvitationState } from "@/types/invitation-action";

const initialState: AcceptInvitationState = {
  error: "",
  success: false,
};

export function AcceptInvitationForm({
  token,
  email,
  viewerStatus,
  loginHref,
}: {
  token: string;
  email: string;
  viewerStatus:
    | "authenticated-matching"
    | "authenticated-wrong"
    | "unauthenticated-existing"
    | "unauthenticated-new";
  loginHref: string;
}) {
  const [state, formAction, isPending] = useActionState(
    acceptInvitation,
    initialState,
  );
  const canAccept = viewerStatus === "authenticated-matching";

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-2">
        <label htmlFor="invitation-email" className="text-sm font-semibold">
          Email
        </label>
        <Input
          id="invitation-email"
          type="email"
          value={email}
          readOnly
          disabled
        />
      </div>

      {viewerStatus === "unauthenticated-existing" && (
        <div className="rounded-md bg-blue-50 px-3 py-3 text-sm text-blue-800">
          <p>Щоб прийняти запрошення, увійдіть у відповідний обліковий запис.</p>
          <Button asChild variant="secondary" className="mt-3">
            <Link href={loginHref}>Увійти</Link>
          </Button>
        </div>
      )}

      {viewerStatus === "unauthenticated-new" && (
        <p className="rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-800">
          Для цього email ще немає активного облікового запису. Безпечна
          реєстрація за запрошенням поки не підключена — зверніться до керівника
          організації.
        </p>
      )}

      {viewerStatus === "authenticated-wrong" && (
        <p className="rounded-md bg-red-50 px-3 py-3 text-sm text-red-700">
          Ви увійшли з іншим email. Вийдіть із системи, увійдіть у запрошений
          обліковий запис і знову відкрийте це посилання.
        </p>
      )}

      {canAccept && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Запрошення буде прийнято поточним обліковим записом. Його email має
          збігатися із запрошенням.
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {state.error}
        </p>
      )}

      {canAccept && (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Прийняття..." : "Прийняти запрошення"}
        </Button>
      )}
    </form>
  );
}
