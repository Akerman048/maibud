import { describe, expect, it } from "vitest";

import { isDocumentVisibleToClient } from "@/lib/document-workflow";

describe("client document visibility", () => {
  it.each([
    ["APPROVED", true, true],
    ["APPROVED", false, false],
    ["SUBMITTED", true, false],
    ["REJECTED", true, false],
    ["DRAFT", true, false],
    ["ARCHIVED", true, false],
  ] as const)(
    "status %s with published=%s returns %s",
    (status, isPublishedToClient, expected) => {
      expect(
        isDocumentVisibleToClient({
          status,
          isPublishedToClient,
        }),
      ).toBe(expected);
    },
  );
});
