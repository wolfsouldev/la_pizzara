export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
export type ApiResponse<T> = { data: T; meta?: PageMeta };
export type ApiError = { error: { code: string; message: string } };
