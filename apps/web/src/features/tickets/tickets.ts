import { useQuery } from '@tanstack/react-query';
import { pageSchema, ticketSummarySchema, publicTicketCommentSchema, ticketDetailSchema, type TicketStatus, type Priority } from '@uni/shared';
import { api } from '@/lib/api-client';
import { queryString } from '@/lib/query-string';
export const statusLabels: Record<TicketStatus, string> = { OPEN: 'Abierto', ASSIGNED: 'Asignado', IN_PROGRESS: 'En progreso', WAITING_USER: 'Esperando tu respuesta', RESOLVED: 'Resuelto', CLOSED: 'Cerrado' };
export const priorityLabels: Record<Priority, string> = { LOW: 'Baja', NORMAL: 'Normal', HIGH: 'Alta', URGENT: 'Urgente' };
export function dateTime(value: number) { return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(value); }
export function useMyTickets(values: { page: number; search: string; status: string }) {
  const qs = queryString(values); return useQuery({ queryKey: ['tickets', 'my', qs], queryFn: async () => pageSchema(ticketSummarySchema).parse(await api<unknown>(`/tickets/my?${qs}`)) });
}
export function useTicket(id: string, historyPage: number) { return useQuery({ queryKey: ['tickets', 'detail', id, historyPage], queryFn: async () => ticketDetailSchema.parse((await api<unknown>(`/tickets/${id}?historyPage=${historyPage}`)).data) }); }
export function useTicketComments(id: string, page: number, enabled: boolean) { return useQuery({ queryKey: ['tickets', 'comments', id, page], enabled, queryFn: async () => pageSchema(publicTicketCommentSchema).parse(await api<unknown>(`/tickets/${id}/comments?page=${page}`)) }); }
