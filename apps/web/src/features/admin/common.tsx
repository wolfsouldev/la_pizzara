import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { pageSchema } from '@uni/shared';
import { api } from '@/lib/api-client';

import { queryString } from '@/lib/query-string';
export function useAdminList<T>(path: string, schema: z.ZodType<T>, values: Record<string, string | number | undefined>) {
  const query = queryString(values);
  return useQuery({ queryKey: ['admin', path, query], queryFn: async () => pageSchema(schema).parse(await api<unknown>(`${path}?${query}`)) });
}
export function useAdminMutation(onSuccess?: () => void) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (request: { path: string; method: string; body?: unknown }) => api<unknown>(request.path, request), onSuccess: () => {
    void client.invalidateQueries({ queryKey: ['admin'] }); void client.invalidateQueries({ queryKey: ['catalog'] }); void client.invalidateQueries({ queryKey: ['session'] }); onSuccess?.();
  } });
}
export { Notice, ListState, Pager, Filters, Status, Heading, tableClass } from '@/components/common/data-view';
