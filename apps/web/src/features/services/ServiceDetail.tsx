import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pageSchema, universityServiceSchema, serviceNoteSchema, serviceNoteCreateSchema, type ServiceNoteCreate } from '@uni/shared';
import { ExternalLink, Clock3, LockKeyhole, MessageSquare, Plus, Trash2, TicketPlus, Globe2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { dateTime } from '@/features/tickets/tickets';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FormSelect, SelectOption } from '@/components/common/select-input';
import { ListState, Notice, Pager } from '@/components/common/data-view';
import { ServiceStatusBadge } from './ServiceStatus';
import { servicePath } from './services';
export function ServiceDetail({ id, admin }: { id: string; admin: boolean }) {
  const [page, setPage] = useState(1); const client = useQueryClient();
  const path = `${servicePath(admin)}/${id}`;
  const notesPath = `${servicePath(admin)}/${id}/notes`;
  const detail = useQuery({ queryKey: ['services', admin ? 'admin' : 'public', 'detail', id], queryFn: async () => universityServiceSchema.parse((await api<unknown>(path)).data), refetchInterval: 30000 });
  const notes = useQuery({ queryKey: ['services', admin ? 'admin' : 'public', 'notes', id, page], queryFn: async () => pageSchema(serviceNoteSchema).parse(await api<unknown>(`${notesPath}?page=${page}&limit=20`)), refetchInterval: 30000 });
  const form = useForm<ServiceNoteCreate>({ resolver: zodResolver(serviceNoteCreateSchema), defaultValues: { body: '', visibility: 'INTERNAL' } });
  const add = useMutation({ mutationFn: (body: ServiceNoteCreate) => api(`${path}/notes`, { method: 'POST', body }), onSuccess: () => { form.reset(); setPage(1); void client.invalidateQueries({ queryKey: ['services'] }); } });
  const remove = useMutation({ mutationFn: (noteId: string) => api(`${path}/notes/${noteId}`, { method: 'DELETE' }), onSuccess: () => { setPage(1); void client.invalidateQueries({ queryKey: ['services'] }); } });
  const t = detail.data;
  return <div><ListState pending={detail.isPending} error={detail.error} empty={false} retry={() => void detail.refetch()}/>{t && <>
    <h2 className="mb-4 break-words text-xl font-semibold">{t.name}</h2><div className="flex flex-wrap items-center justify-between gap-3"><ServiceStatusBadge status={t.status}/>{!t.isActive && <span className="text-xs text-muted-foreground">Archivado · fuera del catálogo</span>}<span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 size={13} aria-hidden="true"/>Estado informado: {dateTime(t.statusUpdatedAt)}</span></div>
    <p className="my-5 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{t.description}</p>
    {t.url && <a className="mb-4 flex min-w-0 items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={t.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`Acceder a ${t.name} (nueva pestaña)`}><ExternalLink size={17} className="mt-0.5 shrink-0" aria-hidden="true"/><span className="min-w-0"><span className="block font-medium">Acceder al servicio<span className="sr-only"> (nueva pestaña)</span></span><span className="mt-1 block break-all text-xs leading-5 text-muted-foreground">{t.url}</span></span></a>}
    {t.isActive && <Button asChild variant="outline" size="sm"><Link to={`/app/tickets/new?serviceId=${t.id}`}><TicketPlus size={15} aria-hidden="true"/>Crear solicitud sobre este servicio</Link></Button>}
    <div className="mb-5 mt-8 flex items-center gap-2 border-t border-border pt-6"><MessageSquare size={17} className="text-primary" aria-hidden="true"/><h3 className="text-sm font-semibold">{admin ? 'Notas y comunicaciones' : 'Notas del servicio'}</h3></div>
    <ListState pending={notes.isPending} error={notes.error} empty={false} retry={() => void notes.refetch()}/>
    {notes.data?.meta.total === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Todavía no hay notas {admin ? 'para este servicio' : 'públicas'}.</p>}
    <ol className="space-y-3">{notes.data?.data.map(n => <li key={n.id} className={`rounded-xl border p-4 ${n.visibility === 'INTERNAL' ? 'border-warning/25 bg-warning/5' : 'border-border bg-muted/25'}`}><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5">{n.visibility === 'INTERNAL' ? <LockKeyhole size={13} aria-hidden="true"/> : <Globe2 size={13} aria-hidden="true"/>}{n.visibility === 'INTERNAL' ? 'Interna · administración' : 'Nota pública'} · {dateTime(n.createdAt)}</span>{admin && <Button type="button" size="icon" variant="ghost" aria-label="Eliminar nota" disabled={remove.isPending} onClick={() => { if (confirm('¿Eliminar esta nota? Se registrará la eliminación en auditoría.')) remove.mutate(n.id); }}><Trash2 size={14} aria-hidden="true"/></Button>}</div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{n.body}</p></li>)}</ol>
    <Pager meta={notes.data?.meta} onPage={setPage}/><Notice error={remove.error}/>
    {admin && <form className="mt-7 rounded-xl border border-border bg-muted/25 p-4" noValidate onSubmit={form.handleSubmit(v => add.mutate(v))}><h3 className="mb-4 text-sm font-semibold">Añadir nota</h3><fieldset disabled={add.isPending} className="space-y-4"><Field id="service-note-visibility" label="Visibilidad"><FormSelect id="service-note-visibility" control={form.control} name="visibility"><SelectOption value="INTERNAL">Interna · solo administración</SelectOption><SelectOption value="PUBLIC">Pública · toda la comunidad</SelectOption></FormSelect></Field><p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole size={14} className="mt-0.5 shrink-0" aria-hidden="true"/>{form.watch('visibility') === 'PUBLIC' ? 'Esta nota será visible para todos los usuarios autenticados. Revisa que no contenga información privada.' : 'Solo ADMIN y SUPER_ADMIN podrán leerla. No será visible para usuarios ni técnicos.'}</p><Field id="service-note-body" label="Contenido de la nota" error={form.formState.errors.body?.message}><textarea id="service-note-body" rows={4} maxLength={5000} {...form.register('body')}/></Field><Button type="submit" size="sm"><Plus size={15} aria-hidden="true"/>{add.isPending ? 'Guardando…' : 'Guardar nota'}</Button></fieldset><Notice error={add.error}/></form>}
  </>}</div>;
}
