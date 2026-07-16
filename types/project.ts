export type ProjectStatus =
  | "open"
  | "processed"
  | "resolved"
  | "returned"
  | "overdue"
  | "archived";

export type Project = {
  id: string;
  name: string;
  address: string;
  customer: string;
  stage: string;
  expert: string;
  deadline: string;
  status: ProjectStatus;
  archivedAt?: string | null;
  archivedByName?: string | null;
  archiveReason?: string | null;
  restoredAt?: string | null;
  restoredByName?: string | null;
};

export type ExpertOption = {
  id: string;
  name: string;
};

export type ProjectOption = {
  id: string;
  name: string;
};
