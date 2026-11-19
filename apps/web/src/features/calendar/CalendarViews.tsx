import { useEffect, useRef } from 'react';
import { CalendarClock, Lock, Video } from 'lucide-react';
import type { CalendarAdminEvent, CalendarEvent } from '@uni/shared';
import { dayLabel, dayStart, hourMinute, moveDay, shortDay, timeLabel, today } from './dates';

export type DisplayEvent = CalendarEvent | CalendarAdminEvent;
export type CalendarView = 'month' | 'week' | 'agenda';
type ViewProps = { days: string[]; month: string; events: DisplayEvent[]; onDay: (day: string, hour?: number) => void; onEvent: (event: DisplayEvent) => void; view: CalendarView };

function eventsOn(events: DisplayEvent[], day: string) {
  const start = dayStart(day), end = dayStart(moveDay(day, 1));
  return events.filter(event => event.startAt < end && event.endAt > start);
}

function EventButton({ event, onEvent, className = '' }: { event: DisplayEvent; onEvent: ViewProps['onEvent']; className?: string }) {
  const isPrivate = 'visibility' in event && event.visibility === 'PRIVATE';
  return <button type="button" onClick={() => onEvent(event)}
    aria-label={`${timeLabel(event.startAt)} · ${event.title}${isPrivate ? ' · Privado' : ''}`}
    className={`flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-left text-xs leading-4 focus-visible:outline-2 focus-visible:outline-ring ${isPrivate ? 'border-border bg-muted text-foreground hover:border-muted-foreground' : 'border-primary/25 bg-primary/15 text-foreground hover:border-primary/70'} ${className}`}>
    {isPrivate ? <Lock className="size-3 shrink-0" aria-hidden="true"/> : <Video className="size-3 shrink-0 text-primary" aria-hidden="true"/>}
    <span className="shrink-0 tabular-nums text-muted-foreground">{timeLabel(event.startAt)}</span><span className="truncate font-medium">{event.title}</span>
  </button>;
}

export function CalendarViews({ days, month, events, onDay, onEvent, view }: ViewProps) {
  const weekViewport = useRef<HTMLDivElement>(null);
  useEffect(() => { if (view === 'week' && weekViewport.current) weekViewport.current.scrollTop = 7 * 48; }, [view]);
  const nowDay = today();
  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  if (view === 'month') return <div className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="grid grid-cols-7 border-b border-border bg-muted/30">{weekdays.map(d => <div key={d} className="px-1 py-3 text-center text-xs font-medium text-muted-foreground">{d}</div>)}</div>
    <div className="grid grid-cols-7 gap-px bg-border">{days.map(day => {
      const list = eventsOn(events, day);
      const outside = !day.startsWith(month);
      return <div key={day} className={`min-h-20 min-w-0 p-1 sm:min-h-[clamp(5rem,10dvh,7rem)] sm:p-2 ${outside ? 'bg-muted text-muted-foreground' : 'bg-card'}`}>
        <button type="button" onClick={() => onDay(day)} aria-label={`Abrir opciones para ${dayLabel(day)}`} aria-current={day === nowDay ? 'date' : undefined} className={`mb-1 min-h-8 min-w-8 rounded-full text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring ${day === nowDay ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>{Number(day.slice(-2))}</button>
        <div className="hidden space-y-1 sm:block">{list.slice(0, 3).map(event => <EventButton key={event.id} event={event} onEvent={onEvent} className="w-full"/> )}</div>
        {list.length > 0 && <button type="button" onClick={() => onDay(day)} className="block min-h-8 w-full rounded text-xs font-medium text-primary hover:bg-accent sm:hidden">{list.length} <span className="sr-only">eventos</span></button>}
        {list.length > 3 && <button type="button" onClick={() => onDay(day)} className="mt-1 hidden min-h-7 rounded px-2 text-xs text-muted-foreground hover:bg-accent sm:block">+{list.length - 3} más</button>}
      </div>;
    })}</div>
  </div>;
  if (view === 'week') return <div ref={weekViewport} className="max-h-[min(68dvh,720px)] min-h-64 overflow-auto rounded-xl border border-border bg-card" role="region" aria-label="Semana por horas" tabIndex={0}>
    <div className="grid min-w-[850px] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] divide-x divide-border">
      <div><div className="sticky top-0 z-10 h-12 border-b border-border bg-card"/>{Array.from({ length: 24 }, (_, h) => <div key={h} className="h-12 border-b border-border/40 px-1 text-right text-[11px] tabular-nums text-muted-foreground">{String(h).padStart(2, '0')}:00</div>)}</div>
      {days.map(day => {
        const start = dayStart(day), end = dayStart(moveDay(day, 1));
        return <div key={day} className="min-w-0">
          <button type="button" aria-current={day === nowDay ? 'date' : undefined} onClick={() => onDay(day)} className={`sticky top-0 z-10 h-12 w-full border-b border-border bg-card text-sm font-medium hover:bg-accent ${day === nowDay ? 'text-primary' : ''}`}>{shortDay(day)}</button>
          <div className="relative">
            {Array.from({ length: 24 }, (_, h) => <button key={h} type="button" tabIndex={-1} aria-label={`${dayLabel(day)} a las ${h}:00`} onClick={() => onDay(day, h)} className="block h-12 w-full border-b border-border/40 hover:bg-accent/60"/>)}
            {eventsOn(events, day).map(event => {
              const from = event.startAt < start ? 0 : hourMinute(event.startAt);
              const to = event.endAt >= end ? 1440 : hourMinute(event.endAt);
              const top = from * 0.8, height = Math.min(1152 - top, Math.max(16, (to - from) * 0.8));
              return <div key={event.id} className="absolute inset-x-1" style={{ top, height }}><EventButton event={event} onEvent={onEvent} className="h-full w-full overflow-hidden"/></div>;
            })}
          </div>
        </div>;
      })}
    </div>
  </div>;
  const groups = days.map(day => ({ day, list: eventsOn(events, day) })).filter(g => g.list.length);
  return <div className="space-y-4">{groups.length ? groups.map(({ day, list }) => <section key={day} className="rounded-xl border border-border bg-card p-4">
    <h2 className="mb-3 font-medium first-letter:uppercase">{dayLabel(day)}</h2>
    <div className="space-y-2">{list.map(event => <EventButton key={event.id} event={event} onEvent={onEvent} className="min-h-10 w-full"/>)}</div>
  </section>) : <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
    <CalendarClock aria-hidden="true" className="mx-auto mb-3 size-6"/>No hay eventos en este período.
  </div>}</div>;
}
