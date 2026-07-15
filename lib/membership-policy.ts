import type { UserRole } from "@/app/generated/prisma/client";

type MembershipPolicyResult =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "SELF_REMOVAL"
        | "LAST_HEAD"
        | "SELF_DEMOTION_LAST_HEAD"
        | "SAME_ROLE";
    };

export function canRemoveOrganizationMember({
  actorUserId,
  targetUserId,
  targetRole,
  activeHeadCount,
}: {
  actorUserId: string;
  targetUserId: string;
  targetRole: UserRole;
  activeHeadCount: number;
}): MembershipPolicyResult {
  if (actorUserId === targetUserId) {
    return { allowed: false, reason: "SELF_REMOVAL" };
  }

  if (targetRole === "HEAD" && activeHeadCount <= 1) {
    return { allowed: false, reason: "LAST_HEAD" };
  }

  return { allowed: true };
}

export function canChangeOrganizationRole({
  actorUserId,
  targetUserId,
  currentRole,
  nextRole,
  activeHeadCount,
}: {
  actorUserId: string;
  targetUserId: string;
  currentRole: UserRole;
  nextRole: UserRole;
  activeHeadCount: number;
}): MembershipPolicyResult {
  if (currentRole === nextRole) {
    return { allowed: false, reason: "SAME_ROLE" };
  }

  if (
    currentRole === "HEAD" &&
    nextRole !== "HEAD" &&
    activeHeadCount <= 1
  ) {
    return {
      allowed: false,
      reason:
        actorUserId === targetUserId
          ? "SELF_DEMOTION_LAST_HEAD"
          : "LAST_HEAD",
    };
  }

  return { allowed: true };
}

export function canApplyInvitationRole({
  currentGlobalRole,
  invitationRole,
  hasOtherActiveOrganizationMemberships,
}: {
  currentGlobalRole: UserRole;
  invitationRole: UserRole;
  hasOtherActiveOrganizationMemberships: boolean;
}) {
  return (
    currentGlobalRole === invitationRole ||
    !hasOtherActiveOrganizationMemberships
  );
}
