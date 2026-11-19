import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Video } from 'lucide-react';
import { z } from 'zod';
import { calendarAdminEventSchema, calendarPublicEventSchema, type CalendarAdminEvent } from '@uni/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ListState, Notice } from '@/components/common/data-view';
import { CalendarViews, type CalendarView, type DisplayEvent } from './CalendarViews';
import { CalendarForm, useCalendarMutation } from './CalendarForms';
import { Reservations, usePendingReservations } from './Reservations';
import { dateTimeLabel, dayLabel, dayStart, localInput, monthLabel, moveDay, moveMonth, timeLabel, today, validDay, weekStart } from './dates';

const publicList = z.array(calendarPublicEventSchema);
const adminList = z.array(calendarAdminEventSchema);
const views: { id: CalendarView; label: string }[] = [{ id: 'month', label: 'Mes' }, { id: 'week', label: 'Semana' }, { id: 'agenda', label: 'Agenda' }];
const isAdminEvent = (event: DisplayEvent): event is CalendarAdminEvent => 'visibility' in event;
type Panel = { kind: 'day'; day: string } | { kind: 'detail'; event: DisplayEvent } | { kind: 'event' | 'request'; day: string; hour: number; event?: CalendarAdminEvent };

export function CalendarPage({ admin = false }: { admin?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [defaultView] = useState<CalendarView>(() => matchMedia('(max-width: 640px)').matches ? 'agenda' : 'month');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [feedback, setFeedback] = useState('');
  const tab = params.get('tab') === 'mine' ? 'mine' : admin && params.get('tab') === 'review' ? 'review' : 'calendar';
  const view = views.find(v => v.id === params.get('view'))?.id ?? defaultView;
  const selected = params.get('date') ?? '';
  const day = validDay(selected) ? selected : today();
  const month = day.slice(0, 7);
  const monthStart = moveMonth(day, 0);
  const firstDay = view === 'week' ? weekStart(day) : view === 'month' ? weekStart(monthStart) : monthStart;
  const nextMonth = moveMonth(day, 1);
  const endDay = view === 'week' ? moveDay(firstDay, 7) : view === 'month' ? moveDay(weekStart(moveDay(nextMonth, -1)), 7) : nextMonth;
  const from = dayStart(firstDay), to = dayStart(endDay);
  const days: string[] = [];
  for (let current = firstDay; current < endDay; current = moveDay(current, 1)) days.push(current);
  const query = useQuery({
    queryKey: ['calendar', 'events', admin, from, to], enabled: tab === 'calendar', refetchInterval: 30000,
    queryFn: async () => (admin ? adminList : publicList).parse((await api<unknown>(`${admin ? '/admin' : ''}/calendar/events?from=${from}&to=${to}`)).data),
  });
  const pending = usePendingReservations(admin);
  const events = query.data ?? [];
  const cancel = useCalendarMutation(() => { setPanel(null); setFeedback('Evento cancelado.'); });
  const updateParams = (updates: Record<string, string>) => setParams(previous => {
    const next = new URLSearchParams(previous);
    for (const [key, value] of Object.entries(updates)) next.set(key, value);
    return next;
  });
  const open = (next: Panel) => { cancel.reset(); setFeedback(''); setPanel(next); };
  const formFor = (kind: 'event' | 'request', target = day, hour?: number) => {
    const nextHour = localInput(Date.now() + 60 * 60_000);
    const selectNext = hour === undefined && target === today();
    open({ kind, day: selectNext ? nextHour.slice(0, 10) : target, hour: hour ?? (selectNext ? Number(nextHour.slice(11, 13)) : 9) });
  };
  const changePeriod = (delta: number) => {
    const next = view === 'week' ? moveDay(day, delta * 7) : moveMonth(day, delta);
    if (validDay(next)) updateParams({ date: next });
  };
  const showWeek = (at: number) => updateParams({ tab: 'calendar', view: 'week', date: localInput(at).slice(0, 10) });
  const details = panel?.kind === 'detail' ? panel.event : null;
  const managed = details && isAdminEvent(details) ? details : null;
  const selectedDay = panel?.kind === 'day' ? panel.day : null;
  const selectedFrom = selectedDay ? dayStart(selectedDay) : 0;
  const selectedTo = selectedDay ? dayStart(moveDay(selectedDay, 1)) : 0;
  const selectedEvents = selectedDay ? events.filter(event => event.startAt < selectedTo && event.endAt > selectedFrom) : [];
  const sectionTitle = tab === 'review' ? 'Solicitudes de reserva' : tab === 'mine' ? 'Mis reservas' : 'Videoconferencias';
  const tabs = [{ id: 'calendar', name: 'Calendario' }, { id: 'mine', name: 'Mis reservas' }, ...(admin ? [{ id: 'review', name: 'Solicitudes de reserva' }] : [])];

  return <section className="space-y-6" aria-label="Calendario de videoconferencias">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary sm:flex"><Video className="size-5" aria-hidden="true"/></span>
        <div><h1 className="text-2xl font-semibold tracking-tight">{sectionTitle}</h1><p className="mt-1 text-sm text-muted-foreground">Agenda universitaria · Hora de La Habana</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => formFor('request', day < today() ? today() : day)} variant={admin && tab === 'calendar' ? 'outline' : 'default'}><Plus aria-hidden="true"/>Solicitar videoconferencia</Button>
        {admin && tab === 'calendar' && <Button onClick={() => formFor('event')}><Plus aria-hidden="true"/>Nuevo evento</Button>}
      </div>
    </header>
    <nav aria-label="Secciones de videoconferencias" className="flex flex-wrap gap-2 border-b border-border pb-2">
      {tabs.map(item => <Button type="button" key={item.id} variant={tab === item.id ? 'secondary' : 'ghost'} aria-current={tab === item.id ? 'page' : undefined} onClick={() => updateParams({ tab: item.id })}>
        {item.name}{item.id === 'review' && pending.data !== undefined && <span aria-label={`${pending.data} pendientes`} className="rounded bg-primary/15 px-1.5 text-xs text-primary">{pending.data}</span>}
      </Button>)}
    </nav>
    {feedback && <p role="status" className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">{feedback}</p>}
    {tab !== 'calendar' ? <Reservations key={tab} review={tab === 'review'} onWeek={showWeek}/> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="outline" onClick={() => updateParams({ date: today() })}>Hoy</Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Período anterior" onClick={() => changePeriod(-1)}><ChevronLeft aria-hidden="true"/></Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Período siguiente" onClick={() => changePeriod(1)}><ChevronRight aria-hidden="true"/></Button>
          <h2 className="ml-1 text-sm font-semibold first-letter:uppercase sm:text-base">{view === 'week' ? `${dayLabel(firstDay)} – ${dayLabel(moveDay(endDay, -1))}` : monthLabel(day)}</h2>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Vista del calendario">{views.map(v => <Button key={v.id} type="button" size="sm" variant={view === v.id ? 'secondary' : 'ghost'} aria-pressed={view === v.id} onClick={() => updateParams({ view: v.id })}>{v.label}</Button>)}</div>
      </div>
      {query.data ? <CalendarViews days={days} month={month} events={events} view={view}
        onDay={(date, hour) => hour === undefined ? open({ kind: 'day', day: date }) : formFor(admin ? 'event' : 'request', date, hour)}
        onEvent={event => open({ kind: 'detail', event })}/>
        : <ListState pending={query.isPending} error={query.error} empty={false} retry={() => void query.refetch()}/>}
      {query.data && <Notice error={query.error}/>}
    </>}
    <Sheet open={!!panel} onOpenChange={value => { if (!value && !cancel.isPending) setPanel(null); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pr-12">
          <SheetTitle>{panel?.kind === 'detail' ? panel.event.title : panel?.kind === 'day' ? dayLabel(panel.day) : panel?.kind === 'request' ? 'Solicitar videoconferencia' : panel?.event ? 'Editar evento' : 'Nuevo evento'}</SheetTitle>
          <SheetDescription>{panel?.kind === 'request' ? 'La reserva se publicará solo después de la aprobación.' : 'Calendario universitario · Hora de La Habana'}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {selectedDay && <>
            {selectedEvents.length ? <ul className="space-y-2">{selectedEvents.map(event => <li key={event.id}><button type="button" onClick={() => open({ kind: 'detail', event })} className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left text-sm hover:bg-accent">
              <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true"/><span className="min-w-0 break-words">{timeLabel(event.startAt)} · {event.title}</span>
            </button></li>)}</ul> : <p className="text-sm text-muted-foreground">No hay eventos visibles ese día.</p>}
            <div className="flex flex-wrap gap-2"><Button onClick={() => formFor('request', selectedDay)}>Solicitar reserva</Button>{admin && <Button variant="outline" onClick={() => formFor('event', selectedDay)}>Crear evento</Button>}</div>
          </>}
          {details && <>
            <div className="flex items-start gap-2 text-sm"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true"/><div>{dateTimeLabel(details.startAt)}<br/>{dateTimeLabel(details.endAt)}</div></div>
            {details.publicDescription && <p className="whitespace-pre-wrap break-words text-sm">{details.publicDescription}</p>}
            {managed && <>
              <span className="inline-block rounded-full border border-border px-3 py-1 text-xs">{managed.visibility === 'PUBLIC' ? 'Público' : 'Privado'}</span>
              {managed.internalNotes && <div className="rounded-lg bg-muted p-3 text-sm"><p className="mb-1 font-medium">Notas internas</p><p className="whitespace-pre-wrap break-words">{managed.internalNotes}</p></div>}
              <Notice error={cancel.error}/>
              <div className="flex flex-wrap gap-2">
                <Button disabled={cancel.isPending} onClick={() => open({ kind: 'event', day, hour: 9, event: managed })}>Editar</Button>
                <Button variant="destructive" disabled={cancel.isPending} onClick={() => {
                  if (confirm('¿Cancelar el evento? Se retirará del calendario.')) cancel.mutate({ method: 'DELETE', path: `/admin/calendar/events/${managed.id}` });
                }}>Cancelar evento</Button>
              </div>
            </>}
          </>}
          {(panel?.kind === 'event' || panel?.kind === 'request') && <CalendarForm key={panel.event?.id ?? `${panel.kind}:${panel.day}:${panel.hour}`} day={panel.day} hour={panel.hour}
            mode={panel.kind} event={panel.event} onSaved={() => { setFeedback(panel.kind === 'request' ? 'Solicitud enviada. Puedes seguirla en Mis reservas.' : 'Evento guardado.'); setPanel(null); if (panel.kind === 'request') updateParams({ tab: 'mine' }); }}/>}
        </div>
      </SheetContent>
    </Sheet>
  </section>;
}
