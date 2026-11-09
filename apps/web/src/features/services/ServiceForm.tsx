import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceCreateSchema, serviceStatuses, serviceStatusLabels, type ServiceCreate, type UniversityService } from '@uni/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FormSelect, SelectOption } from '@/components/common/select-input';
import { Notice } from '@/components/common/data-view';
export function ServiceForm({ service, onSaved }: { service?: UniversityService; onSaved: () => void }) {
  const client = useQueryClient();
  const form = useForm<ServiceCreate>({ resolver: zodResolver(serviceCreateSchema.extend({ status: z.enum(serviceStatuses) })), defaultValues: { url: service?.url ?? null, name: service?.name ?? '', description: service?.description ?? '', status: service?.status ?? 'UNKNOWN' } });
  const mutation = useMutation({ mutationFn: (body: ServiceCreate) => api(`/admin/services${service ? `/${service.id}` : ''}`, { method: service ? 'PATCH' : 'POST', body: service ? Object.fromEntries(Object.entries(body).filter(([key]) => form.formState.dirtyFields[key as keyof ServiceCreate])) : body }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['services'] }); onSaved(); } });
  return <form noValidate onSubmit={form.handleSubmit(v => mutation.mutate(v))}><fieldset disabled={mutation.isPending} className="space-y-5">
    <Field id="service-name" label="Nombre del servicio" error={form.formState.errors.name?.message}><Input id="service-name" autoComplete="off" maxLength={100} placeholder="Nombre que reconocerá la comunidad" {...form.register('name')}/></Field>
    <Field id="service-description" label="Descripción" error={form.formState.errors.description?.message} hint="Explica para qué sirve y a quién está dirigido. No incluyas datos privados."><textarea id="service-description" rows={4} maxLength={3000} {...form.register('description')}/></Field>
    <Field id="service-url" label="Dirección de acceso (opcional)" error={form.formState.errors.url?.message} hint="URL completa HTTP o HTTPS, sin usuarios ni contraseñas. Déjala vacía para quitar el enlace."><Controller control={form.control} name="url" render={({ field }) => <Input id="service-url" type="url" inputMode="url" autoCapitalize="none" spellCheck={false} maxLength={2048} placeholder="https://…" ref={field.ref} name={field.name} value={field.value ?? ''} onBlur={field.onBlur} onChange={e => field.onChange(e.target.value || null)} aria-invalid={!!form.formState.errors.url} aria-describedby={`service-url-hint${form.formState.errors.url ? ' service-url-error' : ''}`}/>}/></Field>
    <Field id="service-status" label="Estado informado" error={form.formState.errors.status?.message} hint="Se informa manualmente. Sin confirmar evita dar por operativo un servicio no verificado."><FormSelect id="service-status" control={form.control} name="status">{serviceStatuses.map(s => <SelectOption key={s} value={s}>{serviceStatusLabels[s]}</SelectOption>)}</FormSelect></Field>
    <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="ghost" onClick={onSaved}>Cancelar</Button><Button type="submit" disabled={!!service && !form.formState.isDirty}>{mutation.isPending ? 'Guardando…' : service ? 'Guardar cambios' : 'Crear servicio'}</Button></div>
  </fieldset><Notice error={mutation.error}/></form>;
}
