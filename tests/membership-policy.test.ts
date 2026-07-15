import { describe, expect, it } from "vitest";

import {
  canApplyInvitationRole,
  canChangeOrganizationRole,
  canRemoveOrganizationMember,
} from "@/lib/membership-policy";

describe("organization member removal policy", () => {
  it("does not allow an actor to remove themselves", () => {
    expect(
      canRemoveOrganizationMember({
        actorUserId: "user-1",
        targetUserId: "user-1",
        targetRole: "DESIGNER",
        activeHeadCount: 2,
      }),
    ).toEqual({ allowed: false, reason: "SELF_REMOVAL" });
  });

  it("does not allow removal of the last active HEAD", () => {
    expect(
      canRemoveOrganizationMember({
        actorUserId: "head-2",
        targetUserId: "head-1",
        targetRole: "HEAD",
        activeHeadCount: 1,
      }),
    ).toEqual({ allowed: false, reason: "LAST_HEAD" });
  });

  it("allows removal of a non-HEAD member", () => {
    expect(
      canRemoveOrganizationMember({
        actorUserId: "head-1",
        targetUserId: "expert-1",
        targetRole: "EXPERT",
        activeHeadCount: 1,
      }),
    ).toEqual({ allowed: true });
  });
});

describe("global invitation role compatibility", () => {
  it("allows the same role across multiple organizations", () => {
    expect(
      canApplyInvitationRole({
        currentGlobalRole: "EXPERT",
        invitationRole: "EXPERT",
        hasOtherActiveOrganizationMemberships: true,
      }),
    ).toBe(true);
  });

  it("allows a role change when no other active organization remains", () => {
    expect(
      canApplyInvitationRole({
        currentGlobalRole: "DESIGNER",
        invitationRole: "CLIENT",
        hasOtherActiveOrganizationMemberships: false,
      }),
    ).toBe(true);
  });

  it("blocks a conflicting role while another organization is active", () => {
    expect(
      canApplyInvitationRole({
        currentGlobalRole: "DESIGNER",
        invitationRole: "EXPERT",
        hasOtherActiveOrganizationMemberships: true,
      }),
    ).toBe(false);
  });
});

describe("organization role change policy", () => {
  it("does not allow the last HEAD to demote themselves", () => {
    expect(
      canChangeOrganizationRole({
        actorUserId: "head-1",
        targetUserId: "head-1",
        currentRole: "HEAD",
        nextRole: "EXPERT",
        activeHeadCount: 1,
      }),
    ).toEqual({
      allowed: false,
      reason: "SELF_DEMOTION_LAST_HEAD",
    });
  });

  it("allows a HEAD role change when another active HEAD remains", () => {
    expect(
      canChangeOrganizationRole({
        actorUserId: "head-2",
        targetUserId: "head-1",
        currentRole: "HEAD",
        nextRole: "EXPERT",
        activeHeadCount: 2,
      }),
    ).toEqual({ allowed: true });
  });

  it("does not allow demoting another user when they are the last HEAD", () => {
    expect(
      canChangeOrganizationRole({
        actorUserId: "head-2",
        targetUserId: "head-1",
        currentRole: "HEAD",
        nextRole: "DESIGNER",
        activeHeadCount: 1,
      }),
    ).toEqual({ allowed: false, reason: "LAST_HEAD" });
  });

  it("rejects a no-op role transition", () => {
    expect(
      canChangeOrganizationRole({
        actorUserId: "head-1",
        targetUserId: "expert-1",
        currentRole: "EXPERT",
        nextRole: "EXPERT",
        activeHeadCount: 1,
      }),
    ).toEqual({ allowed: false, reason: "SAME_ROLE" });
  });
});
