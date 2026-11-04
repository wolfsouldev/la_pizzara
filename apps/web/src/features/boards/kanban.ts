import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { pageSchema, boardLabelSchema, boardSchema, boardDetailSchema, boardMemberSchema, boardCandidateSchema, taskSchema, taskDetailSchema, taskCommentSchema, checklistItemSchema, taskEventSchema, type KanbanTask } from '@uni/shared';
import { api } from '@/lib/api-client';
import { queryString } from '@/lib/query-string';
export const boardTasksKey = (id: string, archived = false) => ['kanban', 'board-tasks', id, archived] as const;
async function allPages<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T[]> {
  const rows: T[] = []; let page = 1;
  while (true) { if (signal?.aborted) throw new Error('Consulta cancelada'); const data = pageSchema(schema).parse(await api<unknown>(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=100`)); rows.push(...data.data); if (page >= data.meta.totalPages) return rows; page++; }
}
export function useBoards(filters: Record<string, string | number>) { const q = queryString(filters); return useQuery({ queryKey: ['kanban', 'boards', q], queryFn: async () => pageSchema(boardSchema).parse(await api<unknown>('/boards?'+q)) }); }
export function useBoard(id: string) { return useQuery({ queryKey: ['kanban', 'board', id], queryFn: async () => boardDetailSchema.parse((await api<unknown>('/boards/'+id)).data) }); }
export function useBoardTasks(id: string, archived: boolean, enabled: boolean) { return useQuery({ queryKey: boardTasksKey(id, archived), queryFn: ({ signal }) => allPages(`/boards/${id}/tasks?archived=${archived}`, taskSchema, signal), enabled }); }
export function useBoardMembers(id: string, enabled = true) { return useQuery({ queryKey: ['kanban', 'members', id], queryFn: ({ signal }) => allPages(`/boards/${id}/members`, boardMemberSchema, signal), enabled }); }
export function useBoardCandidates(id: string, search: string, page: number, enabled: boolean) { const q = queryString({ search, page }); return useQuery({ queryKey: ['kanban', 'candidates', id, q], queryFn: async () => pageSchema(boardCandidateSchema).parse(await api<unknown>(`/boards/${id}/candidates?${q}`)), enabled }); }
export function useTask(id: string) { return useQuery({ queryKey: ['kanban', 'task', id], queryFn: async () => taskDetailSchema.parse((await api<unknown>(`/tasks/${id}`)).data) }); }
export function useTaskComments(id: string, page: number, enabled: boolean) { return useQuery({ queryKey: ['kanban', 'comments', id, page], queryFn: async () => pageSchema(taskCommentSchema).parse(await api<unknown>(`/tasks/${id}/comments?page=${page}`)), enabled }); }
export function useTaskChecklist(id: string, page: number, enabled: boolean) { return useQuery({ queryKey: ['kanban', 'checklist', id, page], queryFn: async () => pageSchema(checklistItemSchema).parse(await api<unknown>(`/tasks/${id}/checklist?page=${page}`)), enabled }); }
export function useTaskEvents(id: string, page: number, enabled: boolean) { return useQuery({ queryKey: ['kanban', 'events', id, page], queryFn: async () => pageSchema(taskEventSchema).parse(await api<unknown>(`/tasks/${id}/events?page=${page}`)), enabled }); }
export function useKanbanMutation(onSuccess?: (data: unknown) => void) {
  const client = useQueryClient();return useMutation({ mutationFn: (request: { path: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) => api<unknown>(request.path, request), onSuccess: result => { void client.invalidateQueries({ queryKey: ['task-links'] }); void client.invalidateQueries({ queryKey: ['staff'] }); void client.invalidateQueries({ queryKey: ['kanban'] }); void client.invalidateQueries({ queryKey: ['admin'] }); onSuccess?.(result.data); }, onError: () => { void client.invalidateQueries({ queryKey: ['kanban'] }); } });
}
export function optimisticMove(rows: KanbanTask[], id: string, columnId: string, index: number) {
  const task = rows.find(t => t.id === id); if (!task) return rows;
  const target = rows.filter(t => t.columnId === columnId && t.id !== id).sort((a,b) => a.position-b.position || a.id.localeCompare(b.id)); target.splice(index, 0, { ...task, columnId }); const positions = new Map(target.map((t,i) => [t.id, (i+1)*1024]));
  return rows.map(t => positions.has(t.id) ? { ...t, columnId, position: positions.get(t.id)! } : t);
}

export function useBoardLabels(id: string) { return useQuery({ queryKey: ['kanban', 'labels', id], queryFn: ({ signal }) => allPages(`/boards/${id}/labels`, boardLabelSchema, signal) }); }
