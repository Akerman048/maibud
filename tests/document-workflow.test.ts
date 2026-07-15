import { describe, expect, it } from "vitest";

import {
  canPublishDocument,
  canReviewDocument,
  canUploadDocumentVersion,
  getNewVersionTransition,
} from "@/lib/document-workflow";

describe("document workflow permissions", () => {
  it.each([
    ["SUBMITTED", true],
    ["DRAFT", false],
    ["APPROVED", false],
    ["REJECTED", false],
    ["ARCHIVED", false],
  ] as const)("canReviewDocument(%s) returns %s", (status, expected) => {
    expect(canReviewDocument(status)).toBe(expected);
  });

  it.each([
    ["APPROVED", true],
    ["DRAFT", false],
    ["SUBMITTED", false],
    ["REJECTED", false],
    ["ARCHIVED", false],
  ] as const)("canPublishDocument(%s) returns %s", (status, expected) => {
    expect(canPublishDocument(status)).toBe(expected);
  });

  it.each([
    ["DRAFT", true],
    ["SUBMITTED", true],
    ["APPROVED", true],
    ["REJECTED", true],
    ["ARCHIVED", false],
  ] as const)(
    "canUploadDocumentVersion(%s) returns %s",
    (status, expected) => {
      expect(canUploadDocumentVersion(status)).toBe(expected);
    },
  );
});

describe("new document version transitions", () => {
  it("submits a draft document for review", () => {
    expect(
      getNewVersionTransition({
        status: "DRAFT",
        isPublishedToClient: false,
        nextVersion: 1,
      }),
    ).toEqual({
      nextStatus: "SUBMITTED",
      clearReview: true,
      clearPublication: false,
      auditAction: "Документ подано на перевірку",
    });
  });

  it("keeps a submitted document under review", () => {
    expect(
      getNewVersionTransition({
        status: "SUBMITTED",
        isPublishedToClient: false,
        nextVersion: 7,
      }),
    ).toEqual({
      nextStatus: "SUBMITTED",
      clearReview: false,
      clearPublication: false,
      auditAction: "Завантажено версію v7 документа",
    });
  });

  it("resubmits a rejected document and clears its review", () => {
    expect(
      getNewVersionTransition({
        status: "REJECTED",
        isPublishedToClient: false,
        nextVersion: 3,
      }),
    ).toEqual({
      nextStatus: "SUBMITTED",
      clearReview: true,
      clearPublication: false,
      auditAction:
        "Завантажено нову версію та повторно подано документ на перевірку",
    });
  });

  it("resubmits an approved document and clears its publication", () => {
    expect(
      getNewVersionTransition({
        status: "APPROVED",
        isPublishedToClient: true,
        nextVersion: 4,
      }),
    ).toEqual({
      nextStatus: "SUBMITTED",
      clearReview: true,
      clearPublication: true,
      auditAction:
        "Завантажено нову версію погодженого документа та повторно подано на перевірку",
    });
  });

  it("rejects a new version for an archived document", () => {
    expect(() =>
      getNewVersionTransition({
        status: "ARCHIVED",
        isPublishedToClient: false,
        nextVersion: 2,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "ARCHIVED_DOCUMENT",
      }),
    );
  });
});
