import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;

export function isValidRequestId(value: string | null | undefined): value is string {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}

export function getRequestId(value: string | null | undefined) {
  return isValidRequestId(value) ? value : randomUUID();
}
