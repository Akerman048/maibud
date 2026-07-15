import { describe, expect, it } from "vitest";

import { getDocumentStatusMeta } from "@/lib/document-status";

describe("document status metadata", () => {
  it.each([
    ["draft", "Чернетка", "warning"],
    ["submitted", "На перевірці", "info"],
    ["approved", "Погоджено", "success"],
    ["rejected", "Відхилено", "danger"],
    ["archived", "Архів", "default"],
  ] as const)(
    "maps %s to its Ukrainian label and badge variant",
    (status, label, variant) => {
      expect(getDocumentStatusMeta(status)).toEqual({ label, variant });
    },
  );
});
