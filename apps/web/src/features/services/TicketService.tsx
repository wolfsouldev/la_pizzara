import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketServiceSchema } from '@uni/shared';
import { Link2, Pencil } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ListState, Notice } from '@/components/common/data-view';
import { ServiceStatusBadge } from './ServiceStatus';
import { ServicePicker } from './ServicePicker';
import { dateTime } from '@/features/tickets/tickets';
export function TicketService({ ticketId, staff = false, closed }: { ticketId: string; staff?: boolean; closed: boolean }) {
  const [editing, setEditing] = useState(false); const [value, setValue] = useState<string | null>(null); const client = useQueryClient(); const location = useLocation();
  const path = `/${staff ? 'staff/' : ''}tickets/${ticketId}/service`;
  const query = useQuery({ queryKey: ['services', 'ticket', staff, ticketId], queryFn: async () => ticketServiceSchema.parse((await api<unknown>(path)).data), refetchInterval: 30000 });
  const mutation = useMutation({ mutationFn: (serviceId: string | null) => api(path, { method: 'PATCH', body: { serviceId } }), onSuccess: () => { setEditing(false); void client.invalidateQueries({ queryKey: ['services', 'ticket'] }); void client.invalidateQueries({ queryKey: [staff ? 'staff' : 'tickets'] }); } });
  const t = query.data; const area = location.pathname.startsWith('/admin') ? 'admin' : staff ? 'staff' : 'app';
  return <article className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold"><Link2 size={16} className="text-primary" aria-hidden="true"/>Servicio relacionado</h2>{t?.canEdit && !closed && !editing && <Button variant="ghost" size="icon" aria-label="Cambiar servicio relacionado" onClick={() => { setValue(t.service?.id ?? null); mutation.reset(); setEditing(true); }}><Pencil size={14} aria-hidden="true"/></Button>}</div><ListState pending={query.isPending} error={query.error} empty={false} retry={() => void query.refetch()}/>
    {t && !editing && (t.service ? <div className="mt-4 space-y-3"><p className="break-words font-medium">{t.service.name}</p><ServiceStatusBadge status={t.service.status}/><p className="text-xs text-muted-foreground">Estado informado: {dateTime(t.service.statusUpdatedAt)}</p>{t.service.isActive ? <Link className="inline-block text-xs text-primary hover:underline" to={`/${area}/services?service=${t.service.id}`}>Ver estado y notas públicas →</Link> : <p className="text-xs text-muted-foreground">Servicio archivado; se conserva la relación de esta solicitud.</p>}</div> : <p className="mt-3 text-sm text-muted-foreground">Sin servicio vinculado.</p>)}
    {editing && !closed && <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); mutation.mutate(value); }}><ServicePicker value={value} onChange={setValue} disabled={mutation.isPending}/><div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar vínculo'}</Button><Button type="button" size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => setEditing(false)}>Cancelar</Button></div><Notice error={mutation.error}/></form>}
  </article>;
}
