"use client";

import { useActionState, useState } from "react";
import { FiCopy, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";

import {
  addMemberToProject,
  createInvitation,
  removeOrganizationMember,
  removeProjectMember,
  resendInvitation,
  revokeInvitation,
  updateOrganizationMemberRole,
} from "@/app/dashboard/head/members/actions";
import type { UserRole } from "@/app/generated/prisma/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { getUserRoleLabel } from "@/lib/user-role";
import type { OrganizationActionState } from "@/types/organization";

type ProjectOption = { id: string; name: string };
type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
  isActive: boolean;
  removedAt: string | null;
  projects: Array<{
    membershipId: string;
    id: string;
    name: string;
    role: UserRole;
  }>;
};
type PendingInvitation = {
  id: string;
  email: string;
  role: UserRole;
  status: "PENDING" | "EXPIRED";
  project: ProjectOption | null;
  invitedByName: string;
  expiresAt: string;
  createdAt: string;
};

const initialState: OrganizationActionState = {
  error: "",
  success: false,
};
const memberRoleOptions = [
  "HEAD",
  "EXPERT",
  "DESIGNER",
  "ARCHIVIST",
  "CLIENT",
].map((role) => ({
  value: role,
  label: getUserRoleLabel(role as UserRole),
}));
const invitationRoleOptions = memberRoleOptions.filter(
  (option) => option.value !== "HEAD",
);

function ActionStateMessage({ state }: { state: OrganizationActionState }) {
  if (!state.error && !state.success) return null;

  return (
    <p
      role={state.error ? "alert" : undefined}
      className={`mt-2 text-xs font-medium ${
        state.error ? "text-red-700" : "text-green-700"
      }`}
    >
      {state.error || "Зміни збережено."}
    </p>
  );
}

function CopyInviteLink({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function copy() {
    try {
      const absoluteUrl = new URL(
        inviteUrl,
        window.location.origin,
      ).toString();
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
      <p className="text-sm font-semibold text-blue-900">
        Email delivery ще не підключено. Надішліть це посилання вручну.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-xs text-blue-800">
          {inviteUrl}
        </code>
        <Button type="button" variant="secondary" onClick={copy}>
          <FiCopy className="mr-2 size-4" />
          {copied ? "Скопійовано" : "Копіювати"}
        </Button>
      </div>
      {copyError && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          Не вдалося скопіювати. Скопіюйте посилання вручну.
        </p>
      )}
    </div>
  );
}

function CreateInvitationModal({
  organizationId,
  projects,
  onClose,
}: {
  organizationId: string;
  projects: ProjectOption[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createInvitation,
    initialState,
  );

  return (
    <Modal
      title="Запросити користувача"
      description="Роль визначає HEAD. Другого HEAD через цю форму запросити не можна."
      onClose={onClose}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="organizationId" value={organizationId} />
        <div className="flex flex-col gap-2">
          <label htmlFor="invite-email" className="text-sm font-semibold">
            Email
          </label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="invite-role" className="text-sm font-semibold">
            Роль
          </label>
          <Select
            id="invite-role"
            name="role"
            options={invitationRoleOptions}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="invite-project" className="text-sm font-semibold">
            Проєкт (необов’язково)
          </label>
          <Select
            id="invite-project"
            name="projectId"
            options={[
              { value: "", label: "Без конкретного проєкту" },
              ...projects.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
            disabled={isPending}
          />
        </div>

        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.inviteUrl && <CopyInviteLink inviteUrl={state.inviteUrl} />}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Закрити
          </Button>
          <Button type="submit" disabled={isPending || Boolean(state.inviteUrl)}>
            {isPending ? "Створення..." : "Створити запрошення"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MemberActions({
  member,
  organizationId,
  currentUserId,
  projects,
}: {
  member: Member;
  organizationId: string;
  currentUserId: string;
  projects: ProjectOption[];
}) {
  const [roleState, roleAction, rolePending] = useActionState(
    updateOrganizationMemberRole,
    initialState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeOrganizationMember,
    initialState,
  );
  const [projectState, projectAction, projectPending] = useActionState(
    addMemberToProject,
    initialState,
  );
  const availableProjects = projects.filter(
    (project) => !member.projects.some((item) => item.id === project.id),
  );

  return (
    <div className="mt-4 grid gap-3 border-t border-[var(--color-border)] pt-4 lg:grid-cols-2">
      <form action={roleAction}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input
          type="hidden"
          name="organizationMemberId"
          value={member.id}
        />
        <div className="flex gap-2">
          <Select
            name="role"
            defaultValue={member.role}
            options={memberRoleOptions}
            disabled={rolePending}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="secondary" disabled={rolePending}>
            Змінити роль
          </Button>
        </div>
        <ActionStateMessage state={roleState} />
      </form>

      {availableProjects.length > 0 && (
        <form action={projectAction}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <input
            type="hidden"
            name="organizationMemberId"
            value={member.id}
          />
          <div className="flex gap-2">
            <Select
              name="projectId"
              options={availableProjects.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
              disabled={projectPending}
              className="min-w-0 flex-1"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={projectPending}
            >
              Додати
            </Button>
          </div>
          <ActionStateMessage state={projectState} />
        </form>
      )}

      {member.userId !== currentUserId && (
        <form action={removeAction} className="lg:col-span-2">
          <input type="hidden" name="organizationId" value={organizationId} />
          <input
            type="hidden"
            name="organizationMemberId"
            value={member.id}
          />
          <Button
            type="submit"
            variant="ghost"
            disabled={removePending}
            className="text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            <FiTrash2 className="mr-2 size-4" />
            Видалити з організації
          </Button>
          <ActionStateMessage state={removeState} />
        </form>
      )}
    </div>
  );
}

function ProjectMembership({
  membership,
  organizationId,
}: {
  membership: Member["projects"][number];
  organizationId: string;
}) {
  const [state, action, isPending] = useActionState(
    removeProjectMember,
    initialState,
  );

  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input
        type="hidden"
        name="projectMembershipId"
        value={membership.membershipId}
      />
      <Badge>{membership.name}</Badge>
      {membership.role !== "HEAD" && (
        <button
          type="submit"
          disabled={isPending}
          title="Видалити з проєкту"
          aria-label={`Видалити з проєкту ${membership.name}`}
          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"
        >
          <FiTrash2 className="size-3.5" />
        </button>
      )}
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}

function InvitationActions({
  invitation,
  organizationId,
}: {
  invitation: PendingInvitation;
  organizationId: string;
}) {
  const [resendState, resendAction, resendPending] = useActionState(
    resendInvitation,
    initialState,
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    revokeInvitation,
    initialState,
  );

  return (
    <div className="mt-4 border-t border-[var(--color-border)] pt-4">
      <div className="flex flex-wrap gap-2">
        <form action={resendAction}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="invitationId" value={invitation.id} />
          <Button type="submit" variant="secondary" disabled={resendPending}>
            <FiRefreshCw className="mr-2 size-4" />
            Оновити посилання
          </Button>
        </form>
        <form action={revokeAction}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="invitationId" value={invitation.id} />
          <Button
            type="submit"
            variant="ghost"
            disabled={revokePending}
            className="text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            Відкликати
          </Button>
        </form>
      </div>
      <ActionStateMessage
        state={resendState.error ? resendState : revokeState}
      />
      {resendState.inviteUrl && (
        <CopyInviteLink inviteUrl={resendState.inviteUrl} />
      )}
    </div>
  );
}

export function TeamManagement({
  organizationId,
  currentUserId,
  members,
  invitations,
  projects,
}: {
  organizationId: string;
  currentUserId: string;
  members: Member[];
  invitations: PendingInvitation[];
  projects: ProjectOption[];
}) {
  const [tab, setTab] = useState("members");
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setInviteOpen(true)}>
          <FiPlus className="mr-2 size-4" />
          Запросити користувача
        </Button>
      </div>

      <Tabs
        activeValue={tab}
        onChange={setTab}
        items={[
          { label: "Учасники", value: "members", count: members.length },
          {
            label: "Очікують запрошення",
            value: "invitations",
            count: invitations.length,
          },
        ]}
      />

      {tab === "members" && (
        <div className="grid gap-4">
          {members.map((member) => (
            <Card key={member.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{member.name}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {member.email}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {member.projects.map((membership) => (
                      <ProjectMembership
                        key={membership.membershipId}
                        membership={membership}
                        organizationId={organizationId}
                      />
                    ))}
                    {member.projects.length === 0 && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Ще не додано до проєктів
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={member.isActive ? "success" : "danger"}>
                    {member.isActive ? "Активний" : "Вимкнений"}
                  </Badge>
                  <div className="mt-2 text-sm font-semibold">
                    {getUserRoleLabel(member.role)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Приєднався {new Date(member.joinedAt).toLocaleDateString("uk-UA")}
                  </div>
                </div>
              </div>
              <MemberActions
                member={member}
                organizationId={organizationId}
                currentUserId={currentUserId}
                projects={projects}
              />
            </Card>
          ))}
        </div>
      )}

      {tab === "invitations" && (
        <div className="grid gap-4">
          {invitations.length === 0 && (
            <Card className="p-8 text-center text-[var(--color-text-secondary)]">
              Немає активних запрошень.
            </Card>
          )}
          {invitations.map((invitation) => (
            <Card key={invitation.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{invitation.email}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {getUserRoleLabel(invitation.role)}
                    {invitation.project ? ` · ${invitation.project.name}` : ""}
                  </div>
                  <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                    Запросив: {invitation.invitedByName}
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      invitation.status === "EXPIRED" ? "danger" : "warning"
                    }
                  >
                    {invitation.status === "EXPIRED" ? "Прострочено" : "Очікує"}
                  </Badge>
                  <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                    До {new Date(invitation.expiresAt).toLocaleString("uk-UA")}
                  </div>
                </div>
              </div>
              <InvitationActions
                invitation={invitation}
                organizationId={organizationId}
              />
            </Card>
          ))}
        </div>
      )}

      {inviteOpen && (
        <CreateInvitationModal
          organizationId={organizationId}
          projects={projects}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </>
  );
}
