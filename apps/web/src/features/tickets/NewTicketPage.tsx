import { ServicePicker } from '@/features/services/ServicePicker';
import { Controller } from 'react-hook-form';
import { FormSelect, SelectOption } from '@/components/common/select-input';
import { SelectGroup } from '@/components/ui/select';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, ShieldCheck, Send } from 'lucide-react';
import { categorySchema, ticketCreateSchema, ticketDetailSchema, UserRole, type TicketCreate } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Heading, ListState, Notice } from '@/components/common/data-view';
import { api } from '@/lib/api-client';
import { useSession } from '@/features/auth/auth';

export function NewTicketPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate(); const client = useQueryClient(); const session = useSession();
  const categories = useQuery({ queryKey: ['catalog', 'categories'], queryFn: async () => z.array(categorySchema).parse((await api<unknown>('/catalog/categories')).data) });
  const form = useForm<TicketCreate>({ resolver: zodResolver(ticketCreateSchema), defaultValues: { title: '', description: '', categoryId: '', serviceId: z.uuid().safeParse(params.get('serviceId')).success ? params.get('serviceId') : null } });
  const selected = categories.data?.find(c => c.id === form.watch('categoryId'));
  useEffect(() => { const id = form.getValues('categoryId'); if (id && categories.data && !categories.data.some(c => c.id === id)) form.setValue('categoryId', '', { shouldValidate: true }); }, [categories.data, form]);
  const departments = [...new Map(categories.data?.map(c => [c.departmentId, c.departmentName]) ?? []).entries()];
  const mutation = useMutation({ mutationFn: async (body: TicketCreate) => ticketDetailSchema.parse((await api<unknown>('/tickets', { method: 'POST', body })).data), onSuccess: ticket => {
    client.setQueryData(['tickets', 'detail', ticket.id, 1], ticket); void client.invalidateQueries({ queryKey: ['tickets', 'my'] }); navigate(`/app/tickets/${ticket.id}`, { replace: true, state: { created: true } });
  } });
  const errors = form.formState.errors;
  return <section>
    <Link to="/app/tickets" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15} aria-hidden="true"/>Mis solicitudes</Link>
    <Heading title="¿En qué podemos ayudarte?" description="Cuéntanos qué ocurre. Enviaremos tu solicitud al equipo adecuado."/>
    <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="surface p-5 sm:p-7"><ListState pending={categories.isPending} error={categories.error} empty={false} retry={() => void categories.refetch()}/>
        {categories.data?.length === 0 ? <div className="space-y-3"><h2 className="font-semibold">No hay categorías disponibles</h2><p className="text-sm text-muted-foreground">El equipo administrador debe habilitar un departamento y sus categorías antes de recibir nuevas solicitudes.</p>{(session.data?.role === UserRole.ADMIN || session.data?.role === UserRole.SUPER_ADMIN) && <Button asChild variant="outline"><Link to="/admin/categories">Gestionar categorías</Link></Button>}</div> : categories.data && <form noValidate onSubmit={form.handleSubmit(v => mutation.mutate(v))}>
          <fieldset disabled={mutation.isPending} className="space-y-6">
            <Field id="ticket-category" label="Categoría" error={errors.categoryId && 'Selecciona una categoría válida'}>
              <FormSelect id="ticket-category" aria-invalid={!!errors.categoryId} aria-describedby={errors.categoryId ? 'ticket-category-error' : undefined} control={form.control} name="categoryId"><SelectOption value="">Selecciona la categoría</SelectOption>{departments.map(([id, name]) => <SelectGroup key={id} label={name}>{categories.data.filter(c => c.departmentId === id).map(c => <SelectOption key={c.id} value={c.id}>{c.name}</SelectOption>)}</SelectGroup>)}</FormSelect>
            </Field>
            {selected && <p className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary"><ArrowRight size={16} className="shrink-0" aria-hidden="true"/><span>Equipo de atención: <strong>{selected.departmentName}</strong></span></p>}
            <Field id="ticket-service" label="Servicio relacionado (opcional)" error={errors.serviceId?.message} hint="Vincula el servicio afectado. La categoría sigue determinando el equipo de atención."><Controller control={form.control} name="serviceId" render={({ field }) => <ServicePicker id="ticket-service" value={field.value ?? null} onChange={field.onChange} disabled={mutation.isPending}/>}/></Field>
            <Field id="ticket-title" label="Título" error={errors.title?.message} hint="Una frase que resuma lo que necesitas.">
              <Input id="ticket-title" maxLength={200} placeholder="Por ejemplo: no puedo conectarme a la red…" aria-invalid={!!errors.title} aria-describedby={`ticket-title-hint${errors.title ? ' ticket-title-error' : ''}`} {...form.register('title')}/>
            </Field>
            <Field id="ticket-description" label="Descripción" error={errors.description?.message} hint="Incluye dónde sucede, desde cuándo y qué has intentado.">
              <textarea id="ticket-description" rows={7} maxLength={10000} placeholder="Describe el problema con el mayor detalle posible…" aria-invalid={!!errors.description} aria-describedby={`ticket-description-hint${errors.description ? ' ticket-description-error' : ''}`} {...form.register('description')}/>
            </Field>
            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={() => navigate('/app/tickets')}>Cancelar</Button><Button type="submit"><Send size={15} aria-hidden="true"/>{mutation.isPending ? 'Enviando…' : 'Enviar solicitud'}</Button></div>
          </fieldset>
        </form>}
        <Notice error={mutation.error}/>{mutation.error && <Button type="button" variant="ghost" onClick={() => void categories.refetch()}>Actualizar categorías disponibles</Button>}
      </div>
      <aside className="space-y-6 text-sm"><div><h2 className="font-medium">Después de enviar</h2><p className="mt-3 leading-6 text-muted-foreground">Podrás seguir el estado y responder al equipo desde <Link className="text-primary hover:underline" to="/app/tickets">Mis solicitudes</Link>. Los avisos llegarán a tus notificaciones.</p></div><div className="rounded-xl border border-border p-5"><ShieldCheck className="mb-3 size-5 text-primary" aria-hidden="true"/><h2 className="text-sm font-medium">Cuida tu información</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">No incluyas contraseñas, códigos de acceso ni otros secretos. Esta versión no admite archivos adjuntos.</p></div></aside>
    </div>
  </section>;
}
