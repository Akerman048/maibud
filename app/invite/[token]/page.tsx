import { auth } from "@/auth";
import { AcceptInvitationForm } from "@/components/organization/AcceptInvitationForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getInvitationByRawToken } from "@/lib/invitation-data";
import { getUserRoleLabel } from "@/lib/user-role";
import { BRAND_NAME } from "@/lib/brand";

function InvitationMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-background)] p-4 sm:p-5">
      <Card className="w-full min-w-0 max-w-lg p-5 text-center sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          {description}
        </p>
      </Card>
    </main>
  );
}

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invitation, session] = await Promise.all([
    getInvitationByRawToken(token),
    auth(),
  ]);

  if (!invitation) {
    return (
      <InvitationMessage
        title="Недійсне запрошення"
        description="Перевірте посилання або попросіть керівника створити нове запрошення."
      />
    );
  }

  if (invitation.status === "REVOKED") {
    return (
      <InvitationMessage
        title="Запрошення відкликано"
        description="Це посилання більше не можна використати."
      />
    );
  }

  if (invitation.status === "ACCEPTED") {
    return (
      <InvitationMessage
        title="Запрошення вже прийнято"
        description={`Увійдіть у свій обліковий запис, щоб перейти до ${BRAND_NAME}.`}
      />
    );
  }

  if (invitation.status === "EXPIRED") {
    return (
      <InvitationMessage
        title="Термін запрошення минув"
        description="Попросіть керівника організації оновити запрошення."
      />
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-background)] p-4 sm:p-5">
      <Card className="w-full min-w-0 max-w-lg p-5 sm:p-8">
        <div className="flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-accent)]">
              Запрошення до організації
            </p>
            <h1 className="mt-1 break-words text-2xl font-bold">
              {invitation.organizationName}
            </h1>
          </div>
          <Badge variant="info">
            {getUserRoleLabel(invitation.role)}
          </Badge>
        </div>

        <dl className="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="text-[var(--color-text-secondary)]">Email</dt>
            <dd className="break-all font-semibold">{invitation.email}</dd>
          </div>
          {invitation.projectName && (
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-[var(--color-text-secondary)]">Проєкт</dt>
              <dd className="break-words font-semibold">{invitation.projectName}</dd>
            </div>
          )}
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="text-[var(--color-text-secondary)]">Діє до</dt>
            <dd className="font-semibold">
              {new Date(invitation.expiresAt).toLocaleString("uk-UA")}
            </dd>
          </div>
        </dl>

        <AcceptInvitationForm
          token={token}
          email={invitation.email}
          isAuthenticated={Boolean(session?.user)}
        />
      </Card>
    </main>
  );
}
