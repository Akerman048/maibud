export type ProjectStatus =
  | "open"
  | "processed"
  | "resolved"
  | "returned"
  | "overdue";

export type Project = {
  id: string;
  name: string;
  address: string;
  customer: string;
  stage: string;
  expert: string;
  deadline: string;
  status: ProjectStatus;
};

export type ExpertOption = {
  id: string;
  name: string;
};

export type ProjectOption = {
  id: string;
  name: string;
};