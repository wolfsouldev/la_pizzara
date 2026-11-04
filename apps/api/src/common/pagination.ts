import type { PageMeta } from '@uni/shared';
export class PaginatedResult<T> {
  readonly data: T[];
  readonly meta: PageMeta;
  constructor(result: { rows: T[]; total: number }, q: { page: number; limit: number }) {
    this.data = result.rows; this.meta = { page: q.page, limit: q.limit, total: result.total, totalPages: Math.ceil(result.total / q.limit) };
  }
}
