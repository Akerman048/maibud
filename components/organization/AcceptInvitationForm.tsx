"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";

import {
  acceptInvitation,
  registerInvitationAccount,
  signOutFromInvitation,
} from "@/app/invite/[token]/actions";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
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
  autoAccept = false,
}: {
  token: string;
  email: string;
  viewerStatus:
    | "authenticated-matching"
    | "authenticated-wrong"
    | "unauthenticated-existing"
    | "unauthenticated-new"
    | "inactive-existing";
  loginHref: string;
  autoAccept?: boolean;
}) {
  const acceptanceFormRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    acceptInvitation,
    initialState,
  );
  const [registrationState, registrationAction, isRegistering] = useActionState(
    registerInvitationAccount,
    initialState,
  );
  const canAccept = viewerStatus === "authenticated-matching";

  useEffect(() => {
    if (autoAccept && canAccept) {
      acceptanceFormRef.current?.requestSubmit();
    }
  }, [autoAccept, canAccept]);

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="invitation-email" className="text-sm font-semibold">
          Email
        </label>
        <Input
          id="invitation-email"
          type="text"
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
          <GoogleSignInButton callbackUrl={`/invite/${token}`} />
        </div>
      )}

      {viewerStatus === "unauthenticated-new" && (
        <>
          <GoogleSignInButton callbackUrl={`/invite/${token}`} />
          <form action={registrationAction} className="flex flex-col gap-3">
            <input type="hidden" name="token" value={token} />
            <Input name="name" placeholder="Ім’я та прізвище" required maxLength={200} />
            <Input name="password" type="password" placeholder="Пароль" required minLength={8} maxLength={128} />
            <Input name="confirmPassword" type="password" placeholder="Повторіть пароль" required minLength={8} maxLength={128} />
            {registrationState.error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {registrationState.error}
              </p>
            )}
            <Button type="submit" disabled={isRegistering}>
              {isRegistering ? "Створення..." : "Створити обліковий запис"}
            </Button>
          </form>
          <Button asChild variant="secondary">
            <Link href={loginHref}>Уже зареєстровані? Увійти</Link>
          </Button>
        </>
      )}

      {viewerStatus === "authenticated-wrong" && (
        <div className="rounded-md bg-red-50 px-3 py-3 text-sm text-red-700">
          <p>
            Ви увійшли з іншим email. Вийдіть із системи та оберіть запрошений
            обліковий запис.
          </p>
          <form action={signOutFromInvitation} className="mt-3">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" variant="secondary" className="w-full">
              Вийти та обрати інший акаунт
            </Button>
          </form>
        </div>
      )}

      {viewerStatus === "inactive-existing" && (
        <p className="rounded-md bg-red-50 px-3 py-3 text-sm text-red-700">
          Обліковий запис для цього запрошення вимкнено. Зверніться до керівника
          організації, щоб відновити доступ.
        </p>
      )}

      {canAccept && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Запрошення буде прийнято поточним обліковим записом. Його email має
          збігатися із запрошенням.
        </p>
      )}

      {autoAccept && canAccept && !state.error && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Завершуємо приєднання до організації…
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
        <form ref={acceptanceFormRef} action={formAction}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Прийняття..." : "Прийняти запрошення"}
          </Button>
        </form>
      )}
    </div>
  );
}
