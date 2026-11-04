import { useQuery } from '@tanstack/react-query';
import { CircleCheck, LoaderCircle, CircleAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { healthSchema } from '@uni/shared';

export function ApiStatus() {
  const health = useQuery({ queryKey: ['health'], queryFn: async () => healthSchema.parse((await api<unknown>('/health')).data), refetchInterval: 30000 });
  if (health.isPending) return <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><LoaderCircle size={16} className="animate-spin"/>Comprobando API y SQLite…</p>;
  if (health.error) return <div role="alert" className="space-y-3"><p className="flex items-center gap-2 text-sm text-destructive"><CircleAlert size={16}/>No hay conexión con el backend</p><p className="text-xs text-muted-foreground">{health.error.message}</p><Button variant="outline" type="button" onClick={() => void health.refetch()}>Reintentar conexión</Button></div>;
  return <p className="flex items-center gap-2 text-sm text-success" role="status"><CircleCheck size={16}/>API disponible · SQLite conectado</p>;
}
