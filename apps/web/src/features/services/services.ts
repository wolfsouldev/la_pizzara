import { useQuery } from '@tanstack/react-query';
import { pageSchema, universityServiceSchema, type ServiceList, type AdminServiceList } from '@uni/shared';
import { api } from '@/lib/api-client';
export function servicePath(admin: boolean) { return admin ? '/admin/services' : '/services'; }
export function useServices(q: ServiceList | AdminServiceList, admin = false) {
  const params = new URLSearchParams(); Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)); });
  return useQuery({ queryKey: ['services', admin ? 'admin' : 'public', 'list', q], queryFn: async () => pageSchema(universityServiceSchema).parse(await api<unknown>(`${servicePath(admin)}?${params}`)), refetchInterval: 30000 });
}
