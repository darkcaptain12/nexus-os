export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type SortOrder = 'asc' | 'desc';

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}
