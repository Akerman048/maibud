export type SortDirection = "asc" | "desc";

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginationMeta = PaginationParams & {
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: PaginationMeta;
};
