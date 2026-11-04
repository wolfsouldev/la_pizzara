import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pageSchema, linkedTaskSchema, linkedTicketSchema, boardDetailSchema } from '@uni/shared';
import { api } from '@/lib/api-client';
export function useLinkedTasks(id: string, page: number) { return useQuery({ queryKey: ['task-links', 'ticket', id, page], queryFn: async () => pageSchema(linkedTaskSchema).parse(await api<unknown>(`/staff/tickets/${id}/tasks?page=${page}`)) }); }
export function useLinkedTickets(id: string, page: number) { return useQuery({ queryKey: ['task-links', 'task', id, page], queryFn: async () => pageSchema(linkedTicketSchema).parse(await api<unknown>(`/tasks/${id}/tickets?page=${page}`)) }); }
export function useLinkBoard(id: string) { return useQuery({ queryKey: ['kanban', 'board', id], queryFn: async () => boardDetailSchema.parse((await api<unknown>('/boards/'+id)).data), enabled: !!id }); }
export function useLinkMutation(done?: () => void) {
  const client = useQueryClient(); return useMutation({ mutationFn: (v: { path: string; method: 'POST' | 'DELETE'; body?: unknown }) => api<unknown>(v.path, v), onSuccess: () => { for (const key of ['task-links', 'staff', 'kanban']) void client.invalidateQueries({ queryKey: [key] }); done?.(); }, onError: () => { for (const key of ['task-links', 'staff', 'kanban']) void client.invalidateQueries({ queryKey: [key] }); } });
}
