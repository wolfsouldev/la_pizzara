import { useEffect, useState } from 'react';
import { CalendarDays, CircleAlert, GitBranch, LockKeyhole, Network } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { KanbanTask } from '@uni/shared';
export const isTaskOverdue = (task: Pick<KanbanTask, 'dueAt' | 'isCompleted' | 'archivedAt'>, now = Date.now()) => task.dueAt !== null && task.dueAt < now && !task.isCompleted && task.archivedAt === null;
export function usePlanningNow() { const [now, setNow] = useState(Date.now); useEffect(() => { const update = () => setNow(Date.now()); const timer = setInterval(update, 60000); document.addEventListener('visibilitychange', update); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); }; }, []); return now; }
export function TaskDeadline({ task }: { task: KanbanTask }) {
  if (task.dueAt === null) return null;
  const overdue = isTaskOverdue(task); const today = !task.isCompleted && task.archivedAt === null && isSameDay(task.dueAt, Date.now()); const Icon = overdue ? CircleAlert : CalendarDays;
  return <span className={`inline-flex flex-wrap items-center gap-1 rounded px-1.5 py-0.5 text-xs ${overdue ? 'bg-destructive/10 text-destructive' : today ? 'bg-warning/10 text-warning' : task.isCompleted ? 'text-success' : 'text-muted-foreground'}`}><Icon size={13} aria-hidden="true"/>{overdue ? 'Vencida · ' : task.isCompleted ? 'Completada · ' : today ? 'Hoy · ' : ''}<time dateTime={new Date(task.dueAt).toISOString()}>{format(task.dueAt, 'dd MMM yyyy, HH:mm', { locale: es })}</time></span>;
}
export function TaskPlanningBadges({ task }: { task: KanbanTask }) {
  return <>{task.parentTaskId && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><GitBranch size={12} aria-hidden="true"/>Subtarea</span>}{task.subtaskTotal > 0 && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Incluye subtareas archivadas"><Network size={12} aria-hidden="true"/>{task.subtaskCompleted}/{task.subtaskTotal} subtareas</span>}{task.blockedByCount > 0 && !task.isCompleted && <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-xs text-warning"><LockKeyhole size={12} aria-hidden="true"/>Bloqueada · {task.blockedByCount}</span>}</>;
}
