import {
  getInvitationCallbackPath,
  invitationCallbackPathSchema,
} from "@/lib/invitation-validation";

export const INVITATION_INTENT_COOKIE = "maibud_invitation_intent";
export const INVITATION_INTENT_MAX_AGE_SECONDS = 15 * 60;

export function parseInvitationIntentPath(value: unknown) {
  const parsed = invitationCallbackPathSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function getInvitationIntentToken(value: unknown) {
  const path = parseInvitationIntentPath(value);
  if (!path) return null;

  const token = path.slice("/invite/".length);
  return getInvitationCallbackPath(token) === path ? token : null;
}
