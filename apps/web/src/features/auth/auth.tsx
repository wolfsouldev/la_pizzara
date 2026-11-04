import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router';
import { UserRole, sessionUserSchema } from '@uni/shared';
import { api, ApiError, setCsrfToken } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export const homeFor = (role: UserRole) => role === UserRole.ADMIN ? '/admin/dashboard' : role === UserRole.TECHNICIAN ? '/staff/dashboard' : '/app/tickets';
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
  if (session.isPending) return <p className="p-8" role="status">Verificando sesión…</p>;
  if (session.error) return <main className="space-y-4 p-8"><h1 className="text-xl font-semibold">No se pudo verificar la sesión</h1><p role="alert">{session.error.message}</p><Button onClick={() => void session.refetch()}>Reintentar</Button></main>;
  if (!session.data) return <Navigate to="/login" replace/>;
  if (roles && !roles.includes(session.data.role)) return <Navigate to="/unauthorized" replace/>;
  return <Outlet/>;
}
