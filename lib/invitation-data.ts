import "server-only";

import { inspectOrganizationInvitation } from "@/lib/invitation-service";

export async function getInvitationByRawToken(
  token: string,
  viewerEmail?: string | null,
) {
  return inspectOrganizationInvitation(token, viewerEmail);
}
