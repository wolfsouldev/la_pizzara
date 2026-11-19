import { calendarTimeZone } from '@uni/shared';

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: calendarTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const dateFormat = new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const monthFormat = new Intl.DateTimeFormat('es', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const shortFormat = new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'short', day: 'numeric' });
const dayMs = 86_400_000;
const isoDay = (n: number) => new Date(n).toISOString().slice(0, 10);
const dayAsUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);

export function localInput(ms: number) {
  const p = Object.fromEntries(clock.formatToParts(ms).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function today() { return localInput(Date.now()).slice(0, 10); }
export function validDay(day: string) {
  if (!/^20\d\d-\d\d-\d\d$/.test(day)) return false;
  const stamp = dayAsUtc(day);
  return Number.isFinite(stamp) && isoDay(stamp) === day;
}
function wallCandidates(value: string): number[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return [];
  const nominal = Date.parse(value + 'Z');
  if (!Number.isFinite(nominal)) return [];
  const candidates = new Set<number>();
  // Try offsets on both sides of a possible change. Ambiguous wall times
  // match twice; nonexistent times match neither. Neither is saved silently.
  for (const probe of [nominal - dayMs, nominal, nominal + dayMs]) {
    const offset = Date.parse(localInput(probe) + 'Z') - probe;
    const candidate = nominal - offset;
    if (localInput(candidate) === value) candidates.add(candidate);
  }
  return [...candidates].sort((a, b) => a - b);
}
export function wallInstant(value: string) {
  const candidates = wallCandidates(value);
  return candidates.length === 1 ? candidates[0] : undefined;
}
export function moveDay(day: string, days: number) { return isoDay(dayAsUtc(day) + days * dayMs); }
export function weekStart(day: string) { return moveDay(day, -((new Date(dayAsUtc(day)).getUTCDay() + 6) % 7)); }
export function moveMonth(day: string, months: number) {
  const d = new Date(dayAsUtc(day));
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  return isoDay(d.getTime());
}
export function dayStart(day: string) {
  const midnight = wallCandidates(day + 'T00:00')[0];
  if (midnight !== undefined) return midnight;
  // Some zones can advance the clock at midnight. The first representable
  // instant of the date is the calendar boundary, not the prior day.
  for (let hour = 1; hour < 24; hour++) {
    const next = wallCandidates(`${day}T${String(hour).padStart(2, '0')}:00`)[0];
    if (next !== undefined) return next;
  }
  throw new RangeError('No se pudo resolver el inicio del día');
}
export const dayLabel = (day: string) => dateFormat.format(dayAsUtc(day));
export const monthLabel = (day: string) => monthFormat.format(dayAsUtc(day)).replace(/^./u, letter => letter.toLocaleUpperCase('es'));
export const shortDay = (day: string) => shortFormat.format(dayAsUtc(day));
export const timeLabel = (ms: number) => localInput(ms).slice(11);
export const dateTimeLabel = (ms: number) => `${dayLabel(localInput(ms).slice(0, 10))}, ${timeLabel(ms)}`;
export const hourMinute = (ms: number) => { const [h = 0, m = 0] = timeLabel(ms).split(':').map(Number); return h * 60 + m; };
