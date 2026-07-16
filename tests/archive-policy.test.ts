import { describe, expect, it } from "vitest";

import {
  ArchivePolicyError,
  canArchiveDocument,
  canArchiveProject,
  canRestoreDocument,
  canRestoreProject,
  getDocumentRestoreStatus,
  getProjectRestoreStatus,
} from "@/lib/archive-policy";

describe("project archive policy", () => {
  it.each(["HEAD", "ARCHIVIST"] as const)(
    "allows %s to archive an active project",
    (role) => {
      expect(canArchiveProject({ role, projectStatus: "OPEN" })).toBe(true);
    },
  );

  it.each(["EXPERT", "DESIGNER", "CLIENT"] as const)(
    "denies project archive to %s",
    (role) => {
      expect(canArchiveProject({ role, projectStatus: "OPEN" })).toBe(false);
    },
  );

  it("denies archiving an already archived project", () => {
    expect(canArchiveProject({ role: "HEAD", projectStatus: "ARCHIVED" })).toBe(false);
  });

  it("restores only archived projects", () => {
    expect(canRestoreProject({ role: "ARCHIVIST", projectStatus: "ARCHIVED" })).toBe(true);
    expect(canRestoreProject({ role: "ARCHIVIST", projectStatus: "COMPLETED" })).toBe(false);
  });

  it("restores the previous project status with an OPEN fallback", () => {
    expect(getProjectRestoreStatus("RETURNED")).toBe("RETURNED");
    expect(getProjectRestoreStatus("ARCHIVED")).toBe("OPEN");
    expect(getProjectRestoreStatus(null)).toBe("OPEN");
  });
});

describe("document archive policy", () => {
  it.each(["APPROVED", "REJECTED"] as const)(
    "allows archiving %s documents",
    (status) => {
      expect(canArchiveDocument({ role: "HEAD", status })).toBe(true);
    },
  );

  it.each(["DRAFT", "SUBMITTED", "ARCHIVED"] as const)(
    "denies archiving %s documents",
    (status) => {
      expect(canArchiveDocument({ role: "ARCHIVIST", status })).toBe(false);
    },
  );

  it.each(["APPROVED", "REJECTED"] as const)(
    "restores an archived document to %s",
    (previousStatus) => {
      expect(canRestoreDocument({
        role: "ARCHIVIST",
        status: "ARCHIVED",
        previousStatus,
      })).toBe(true);
      expect(getDocumentRestoreStatus(previousStatus)).toBe(previousStatus);
    },
  );

  it("denies invalid previous status", () => {
    expect(canRestoreDocument({
      role: "HEAD",
      status: "ARCHIVED",
      previousStatus: "SUBMITTED",
    })).toBe(false);
    expect(() => getDocumentRestoreStatus("SUBMITTED")).toThrow(
      ArchivePolicyError,
    );
  });

  it.each(["EXPERT", "DESIGNER", "CLIENT"] as const)(
    "denies document archive and restore to %s",
    (role) => {
      expect(canArchiveDocument({ role, status: "APPROVED" })).toBe(false);
      expect(canRestoreDocument({
        role,
        status: "ARCHIVED",
        previousStatus: "APPROVED",
      })).toBe(false);
    },
  );
});
