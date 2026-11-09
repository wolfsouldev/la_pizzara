import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pageSchema, staffTicketSummarySchema, staffTicketDetailSchema, staffCommentSchema, staffEventSchema, staffOptionsSchema, ticketDashboardSchema } from '@uni/shared';
import { useLocation } from 'react-router';
import { api } from '@/lib/api-client';
import { queryString } from '@/lib/query-string';
export const useStaffArea = () => useLocation().pathname.startsWith('/admin') ? '/admin' : '/staff';
export function useStaffOptions() { return useQuery({ queryKey: ['staff', 'options'], queryFn: async () => staffOptionsSchema.parse((await api<unknown>('/staff/tickets/options')).data) }); }
export function useStaffTickets(filters: Record<string, string | number | undefined>, enabled = true) { const q = queryString(filters); return useQuery({ enabled, queryKey: ['staff', 'tickets', q], queryFn: async () => pageSchema(staffTicketSummarySchema).parse(await api<unknown>(`/staff/tickets?${q}`)) }); }
export function useStaffTicket(id: string) { return useQuery({ queryKey: ['staff', 'detail', id], refetchInterval: 30000, queryFn: async () => staffTicketDetailSchema.parse((await api<unknown>(`/staff/tickets/${id}`)).data) }); }
export function useStaffComments(id: string, page: number, enabled: boolean) { return useQuery({ queryKey: ['staff', 'comments', id, page], queryFn: async () => pageSchema(staffCommentSchema).parse(await api<unknown>(`/staff/tickets/${id}/comments?page=${page}`)), enabled }); }
export function useStaffEvents(id: string, page: number, enabled: boolean) { return useQuery({ queryKey: ['staff', 'events', id, page], refetchInterval: 30000, queryFn: async () => pageSchema(staffEventSchema).parse(await api<unknown>(`/staff/tickets/${id}/events?page=${page}`)), enabled }); }
export function useTicketDashboard(area: string) { return useQuery({ refetchInterval: 30000, queryKey: ['staff', 'dashboard', area], queryFn: async () => ticketDashboardSchema.parse((await api<unknown>(`${area}/dashboard`)).data) }); }
export function useStaffMutation(id: string, onSuccess?: () => void) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (request: { operation: string; method: 'PATCH' | 'POST'; body: unknown }) => api<unknown>(`/staff/tickets/${id}/${request.operation}`, request), onSuccess: () => {
    void client.invalidateQueries({ queryKey: ['task-links'] }); void client.invalidateQueries({ queryKey: ['staff'] }); void client.invalidateQueries({ queryKey: ['tickets'] }); void client.invalidateQueries({ queryKey: ['admin'] }); onSuccess?.();
  }, onError: () => { void client.invalidateQueries({ queryKey: ['staff', 'detail', id] }); } });
}
