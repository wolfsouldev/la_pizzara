import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router';
import { roleMatches, UserRole, sessionUserSchema } from '@uni/shared';
import { api, ApiError, setCsrfToken } from '@/lib/api-client';
import { SessionStatusPage } from './SessionStatusPage';

export const homeFor = (role: UserRole) => role === UserRole.SUPER_ADMIN ? '/admin/dashboard' : role === UserRole.ADMIN ? '/admin/services' : role === UserRole.TECHNICIAN ? '/staff/dashboard' : '/app/tickets';
export function useSession() {
  return useQuery({ queryKey: ['session'], queryFn: async () => {
    try {
      const user = sessionUserSchema.parse((await api<unknown>('/auth/me')).data);
      setCsrfToken(user.csrfToken); return user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { setCsrfToken(); return null; }
      throw error;
    }
  }, retry: false, refetchInterval: 60000 });
}
export function useLogout() {
  const client = useQueryClient();
  return useMutation({ mutationFn: async () => {
    // Obtain current session CSRF even after a prelogin token was issued in
    // another view; never send a stale anonymous token to a protected mutation.
    try {
      const user = sessionUserSchema.parse((await api<unknown>('/auth/me')).data);
      setCsrfToken(user.csrfToken); await api<void>('/auth/logout', { method: 'POST' });
    } catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
  }, onSuccess: () => {
    setCsrfToken(); void client.cancelQueries();
    // Keep the observed session query alive so route Guards receive null and
    // unmount private content immediately; clear() disconnects those observers.
    client.removeQueries({ predicate: query => query.queryKey[0] !== 'session' });
    client.setQueryData(['session'], null);
  } });
}
export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const session = useSession();
  if (session.isPending || session.error) return <SessionStatusPage error={session.error} pending={session.isPending || session.isFetching} retry={() => void session.refetch()}/>;
  if (!session.data) return <Navigate to="/login" replace/>;
  if (roles && !roleMatches(session.data.role, roles)) return <Navigate to="/unauthorized" replace/>;
  return <Outlet/>;
}
