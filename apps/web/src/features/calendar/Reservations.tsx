import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarRequestSchema, calendarReviewRequestSchema, pageSchema, reservationStates, type CalendarRequest, type CalendarReviewRequest } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { Notice, ListState, Pager } from '@/components/common/data-view';
import { SelectInput, SelectOption } from '@/components/common/select-input';
import { api } from '@/lib/api-client';
import { queryString } from '@/lib/query-string';
import { dateTimeLabel } from './dates';
import { DecisionForm, useCalendarMutation } from './CalendarForms';

const labels = { PENDING: 'Pendiente', APPROVED: 'Aprobada', REJECTED: 'Rechazada', WITHDRAWN: 'Retirada' };
const colors = { PENDING: 'border-warning/35 bg-warning/10 text-warning', APPROVED: 'border-primary/30 bg-primary/10 text-primary', REJECTED: 'border-destructive/30 bg-destructive/10 text-destructive', WITHDRAWN: 'border-border bg-muted text-muted-foreground' };
export function usePendingReservations(admin: boolean) {
  return useQuery({ enabled: admin, refetchInterval: 30000, queryKey: ['calendar', 'pending-count'],
    queryFn: async () => pageSchema(calendarReviewRequestSchema).parse(await api<unknown>('/admin/calendar/requests?status=PENDING&limit=1')).meta.total });
}

function ReservationCard({ item, onWeek }: { item: CalendarRequest | CalendarReviewRequest; onWeek: (at: number) => void }) {
  const [opened, setOpened] = useState(false);
  const mutation = useCalendarMutation(() => setOpened(false));
  const reviewing = 'requester' in item;
  const cancelled = item.event?.cancelledAt != null;
  return <article className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="break-words font-semibold">{item.title}</h2><p className="mt-1 text-sm text-muted-foreground">{dateTimeLabel(item.event?.startAt ?? item.startAt)} → {dateTimeLabel(item.event?.endAt ?? item.endAt)}</p></div>
      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${cancelled ? colors.WITHDRAWN : colors[item.status]}`}>{cancelled ? 'Evento cancelado' : labels[item.status]}</span>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{item.attendees} participantes</span>{reviewing && <span>Solicita: {item.requester.displayName}</span>}</div>
    <p className="whitespace-pre-wrap break-words text-sm">{item.purpose}</p>
    {item.notes && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">Observaciones: {item.notes}</p>}
    {item.decisionNote && <p className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-sm">Nota de administración: {item.decisionNote}</p>}
    {item.status === 'PENDING' && <>
      <Notice error={mutation.error}/>
      {reviewing ? <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onWeek(item.startAt)}>Ver semana en el calendario</Button>
          {!opened && <Button type="button" onClick={() => setOpened(true)}>Revisar solicitud</Button>}
        </div>
        {opened && <DecisionForm request={item} onSaved={() => setOpened(false)}/>}
      </div> : <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => {
        if (confirm('¿Retirar esta solicitud pendiente?')) mutation.mutate({ path: `/calendar/requests/${item.id}`, method: 'DELETE' });
      }}>Retirar solicitud</Button>}
    </>}
  </article>;
}
export function Reservations({ review, onWeek }: { review: boolean; onWeek: (at: number) => void }) {
  const [status, setStatus] = useState(review ? 'PENDING' : '');
  const [page, setPage] = useState(1);
  const q = queryString({ page, status });
  const list = useQuery({
    queryKey: ['calendar', 'requests', review, q], refetchInterval: 30000,
    queryFn: async () => review
      ? pageSchema(calendarReviewRequestSchema).parse(await api<unknown>(`/admin/calendar/requests?${q}`))
      : pageSchema(calendarRequestSchema).parse(await api<unknown>(`/calendar/requests?${q}`)),
  });
  return <section className="space-y-4" aria-label={review ? 'Solicitudes de reserva' : 'Mis reservas'}>
    <div className="max-w-xs"><label>Estado<SelectInput value={status} onValueChange={value => { setStatus(value); setPage(1); }}><SelectOption value="">Todos los estados</SelectOption>{reservationStates.map(state => <SelectOption key={state} value={state}>{labels[state]}</SelectOption>)}</SelectInput></label></div>
    <ListState pending={list.isPending} error={list.error} empty={list.data?.meta.total === 0} retry={() => void list.refetch()}/>
    {list.data?.data.map(item => <ReservationCard key={item.id} item={item} onWeek={onWeek}/>)}
    <Pager meta={list.data?.meta} onPage={setPage}/>
  </section>;
}
