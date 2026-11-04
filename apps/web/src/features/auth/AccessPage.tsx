import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export function AccessPage({ area }: { area: 'admin' | 'staff' }) {
  const access = useQuery({ queryKey: ['access', area], queryFn: () => api<{ area: string; message: string }>(`/${area}/access`) });
  return <section><h1 className="text-2xl font-semibold">Permisos de {area === 'admin' ? 'administración' : 'atención'}</h1><p className="mt-3 text-muted-foreground">Esta comprobación consulta una ruta protegida por sesión y rol en NestJS.</p><article className="mt-8 max-w-2xl rounded-xl border bg-card p-6">
    {access.isPending ? <p role="status">Comprobando permiso en el servidor…</p> : access.error ? <div className="space-y-4"><p role="alert" className="text-destructive">{access.error.message}</p><Button onClick={() => void access.refetch()}>Reintentar</Button></div> : <p className="flex items-center gap-3 font-medium text-success"><ShieldCheck size={24}/>{access.data.data.message}</p>}
    <p className="mt-5 text-sm leading-relaxed text-muted-foreground">Tus permisos se aplican en el servidor. Si necesitas acceso a otro departamento o tablero, solicita el cambio a un administrador.</p>
  </article></section>;
}
