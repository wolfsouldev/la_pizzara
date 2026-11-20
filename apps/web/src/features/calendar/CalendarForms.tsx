import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarApproveSchema, calendarEventInputSchema, calendarRejectSchema, calendarRequestInputSchema, type CalendarAdminEvent, type CalendarReviewRequest } from '@uni/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/common/data-view';
import { SelectInput, SelectOption } from '@/components/common/select-input';
import { localInput, wallInstant } from './dates';

export function useCalendarMutation(onSaved: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) => api(path, { method, body }),
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: ['calendar'] }), client.invalidateQueries({ queryKey: ['notifications'] })]);
      onSaved();
    },
  });
}

type Fields = {
  title: string; start: string; end: string; duration: string; visibility: 'PRIVATE' | 'PUBLIC';
  publicDescription: string; meetingLink: string; internalNotes: string; purpose: string; attendees: string; notes: string;
};
const numberMinutes = (value: string) => /^\d+$/.test(value) ? Number(value) : NaN;
const nullable = (value: string) => value.trim() || null;

export function CalendarForm({ event, day, hour, mode, onSaved }: { event?: CalendarAdminEvent; day: string; hour: number; mode: 'event' | 'request'; onSaved: () => void }) {
  const mutation = useCalendarMutation(onSaved);
  const [byDuration, setByDuration] = useState(!event);
  const [error, setError] = useState('');
  const form = useForm<Fields>({ defaultValues: {
    title: event?.title ?? '', start: event ? localInput(event.startAt) : `${day}T${String(hour).padStart(2, '0')}:00`,
    end: event ? localInput(event.endAt) : '', duration: event ? String((event.endAt - event.startAt) / 60000) : '60',
    visibility: event?.visibility ?? 'PRIVATE', publicDescription: event?.publicDescription ?? '', meetingLink: event?.meetingLink ?? '', internalNotes: event?.internalNotes ?? '',
    purpose: '', attendees: '1', notes: '',
  } });
  const submit = form.handleSubmit(value => {
    setError('');
    const startAt = event && localInput(event.startAt) === value.start ? event.startAt : wallInstant(value.start);
    if (startAt === undefined) { setError('La hora de inicio no es válida o es ambigua en la hora de La Habana. Elige otra.'); return; }
    const endAt = byDuration ? startAt + numberMinutes(value.duration) * 60_000
      : event && localInput(event.endAt) === value.end ? event.endAt : wallInstant(value.end);
    if (endAt === undefined || !Number.isFinite(endAt)) { setError('Introduce una duración en minutos o una hora de fin válida y no ambigua.'); return; }
    const slot = { startAt, endAt, title: value.title };
    const parsed = mode === 'event'
      ? calendarEventInputSchema.safeParse({ ...slot, visibility: value.visibility, publicDescription: nullable(value.publicDescription), meetingLink: value.meetingLink || null, internalNotes: nullable(value.internalNotes) })
      : calendarRequestInputSchema.safeParse({ ...slot, purpose: value.purpose, attendees: numberMinutes(value.attendees), notes: nullable(value.notes) });
    if (!parsed.success) {
      setError(parsed.error.issues.map(issue => {
        const labels: Record<string, string> = { title: 'Título', purpose: 'Propósito', attendees: 'Participantes', endAt: 'Hora de fin', startAt: 'Inicio' };
        const name = String(issue.path[0]);
        return `${labels[name] ?? name}: ${issue.message}`;
      }).join(' · '));
      return;
    }
    mutation.mutate({ path: mode === 'request' ? '/calendar/requests' : `/admin/calendar/events${event ? '/' + event.id : ''}`, method: event ? 'PATCH' : 'POST', body: parsed.data });
  });
  return <form className="space-y-4" onSubmit={submit}>
    <fieldset disabled={mutation.isPending} className="space-y-4">
      <label>Título<input required maxLength={160} placeholder={mode === 'event' ? 'Nombre que aparecerá en el calendario' : 'Nombre de la videoconferencia'} {...form.register('title')}/></label>
      <label>Inicio · hora de La Habana<input required type="datetime-local" {...form.register('start')}/></label>
      <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
        <label>Cómo indicar el fin<SelectInput value={byDuration ? 'duration' : 'end'} onValueChange={value => setByDuration(value === 'duration')}><SelectOption value="duration">Por duración</SelectOption><SelectOption value="end">Fecha y hora de fin</SelectOption></SelectInput></label>
        {byDuration ? <label>Duración (minutos)<input type="number" min={15} max={10080} step={1} required {...form.register('duration')}/></label>
          : <label>Fin · hora de La Habana<input required type="datetime-local" {...form.register('end')}/></label>}
      </div>
      {mode === 'event' ? <>
        <label>Visibilidad<SelectInput value={form.watch('visibility')} disabled={Boolean(event?.requestId)} onValueChange={value => form.setValue('visibility', value === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE')}><SelectOption value="PRIVATE">Privado · administración</SelectOption><SelectOption value="PUBLIC">Público · comunidad autenticada</SelectOption></SelectInput></label>
        <label>Descripción pública (opcional)<textarea rows={3} maxLength={2000} {...form.register('publicDescription')}/></label>
        <label>Enlace de acceso (opcional)<input type="text" placeholder="Pega el enlace de la videoconferencia" {...form.register('meetingLink')}/></label>
        <p className="text-xs text-muted-foreground">Si publicas el evento, la comunidad autenticada verá este enlace.</p>
        <label>Notas internas (opcional)<textarea rows={3} maxLength={2000} {...form.register('internalNotes')}/></label>
      </> : <>
        <label>Propósito de la videoconferencia<textarea required rows={3} maxLength={2000} {...form.register('purpose')}/></label>
        <label>Cantidad de participantes<input required type="number" min={1} max={10000} step={1} {...form.register('attendees')}/></label>
        <label>Observaciones (opcional)<textarea rows={3} maxLength={2000} {...form.register('notes')}/></label>
      </>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Notice error={mutation.error}/>
    <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : mode === 'request' ? 'Enviar solicitud' : 'Guardar evento'}</Button>
  </form>;
}

export function DecisionForm({ request, onSaved }: { request: CalendarReviewRequest; onSaved: () => void }) {
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const mutation = useCalendarMutation(onSaved);
  const form = useForm({ defaultValues: { publicTitle: request.title, publicDescription: '', meetingLink: '', note: '' } });
  const submit = form.handleSubmit(values => {
    setError('');
    if (!decision) return;
    const parsed = decision === 'approve'
      ? calendarApproveSchema.safeParse({ publicTitle: values.publicTitle, publicDescription: nullable(values.publicDescription), meetingLink: values.meetingLink || null, note: nullable(values.note) })
      : calendarRejectSchema.safeParse({ note: values.note });
    if (!parsed.success) { setError(decision === 'reject' ? 'Escribe un motivo para rechazar la solicitud.' : 'Revisa el título público y la longitud de los textos.'); return; }
    mutation.mutate({ path: `/admin/calendar/requests/${request.id}/${decision}`, method: 'POST', body: parsed.data });
  });
  if (!decision) return <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => setDecision('approve')}>Preparar aprobación</Button><Button type="button" variant="outline" onClick={() => setDecision('reject')}>Rechazar</Button></div>;
  return <form className="space-y-4 border-t border-border pt-4" onSubmit={submit}>
    {decision === 'approve' && <>
      <p className="text-sm text-muted-foreground">El título y el horario serán públicos en La Pizzara. Revisa que no contengan datos personales.</p>
      <label>Título público<input required maxLength={160} {...form.register('publicTitle')}/></label>
      <label>Descripción pública (opcional)<textarea rows={2} maxLength={2000} {...form.register('publicDescription')}/></label>
      <label>Enlace de acceso (opcional)<input type="text" placeholder="Pega el enlace que se publicará" {...form.register('meetingLink')}/></label>
    </>}
    <label>{decision === 'reject' ? 'Motivo para el solicitante' : 'Nota para el solicitante (opcional)'}<textarea required={decision === 'reject'} rows={3} maxLength={2000} {...form.register('note')}/></label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Notice error={mutation.error}/>
    <div className="flex flex-wrap gap-2"><Button type="submit" variant={decision === 'reject' ? 'destructive' : 'default'} disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : decision === 'approve' ? 'Aprobar y publicar' : 'Confirmar rechazo'}</Button>
      <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => { setDecision(null); setError(''); mutation.reset(); }}>Atrás</Button></div>
  </form>;
}
