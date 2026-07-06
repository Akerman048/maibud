export type DocumentStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "archived";

export type DocumentItem = {
  id: string;
  name: string;
  project: string;
  type: string;
  status: DocumentStatus;
};