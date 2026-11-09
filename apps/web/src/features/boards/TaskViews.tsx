import { TaskDeadline, TaskPlanningBadges } from '@/features/tasks/TaskTiming';
import { SelectInput, SelectOption } from '@/components/common/select-input';
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';
import { ArrowDown, ArrowUp, CheckCircle2, Circle, GripVertical, ListChecks, Plus, UserRound } from 'lucide-react';
import type { BoardDetail, KanbanTask } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { priorityLabels } from '@/features/tickets/tickets';
import { LabelBadge } from './BoardLabels';
export const orderTasks = (a: KanbanTask, b: KanbanTask) => a.position - b.position || a.id.localeCompare(b.id);
export type MoveTask = (id: string, columnId: string, index: number) => void;
type TargetData = { columnId: string; index: number };
function Priority({ task }: { task: KanbanTask }) {
  return <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs ${task.priority === 'URGENT' ? 'bg-destructive/10 text-destructive' : task.priority === 'HIGH' ? 'bg-warning/10 text-warning' : 'bg-secondary text-muted-foreground'}`}>{priorityLabels[task.priority]}</span>;
}
function Assignees({ task }: { task: KanbanTask }) {
  if (!task.assignees.length) return <span className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground" title="Sin responsable"><UserRound size={12} aria-hidden="true"/><span className="sr-only">Sin responsable</span></span>;
  const names = task.assignees.map(a => a.displayName).join(', ');
  return <span className="flex shrink-0 -space-x-1" role="img" aria-label={`Responsables: ${names}`} title={names}>
    {task.assignees.slice(0, 3).map(person => <span key={person.id} aria-hidden="true" className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-medium text-foreground">{person.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>)}
    {task.assignees.length > 3 && <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px]">+{task.assignees.length - 3}</span>}
  </span>;
}
function TaskCard({ task, index, editable, open }: { task: KanbanTask; index: number; editable: boolean; open: () => void }) {
  const drag = useDraggable({ id: task.id, type: 'task', disabled: !editable });
  const drop = useDroppable<TargetData>({ id: `slot:${task.id}`, data: { columnId: task.columnId, index }, accept: 'task', collisionPriority: 1, disabled: !editable });
  return <div ref={drop.ref} data-task-id={task.id} className={`border-t-2 pt-0.5 ${drop.isDropTarget ? 'border-primary' : 'border-transparent'}`}>
    <article ref={drag.ref} className={`group rounded-lg border border-border/70 bg-card p-3 shadow-sm transition-colors hover:border-muted-foreground/60 hover:bg-popover ${drag.isDragging ? 'opacity-40' : ''}`}>
      <div className="flex items-start gap-1"><button className="min-h-11 min-w-0 grow break-words text-left text-sm font-medium leading-5 hover:text-primary" onClick={open}>{task.title}</button>{editable && <button type="button" ref={drag.handleRef} className="-mr-1 inline-flex size-7 shrink-0 touch-none items-center justify-center rounded text-muted-foreground/60 hover:bg-secondary hover:text-foreground max-md:w-11" aria-label={`Arrastrar ${task.title}`}><GripVertical size={15}/></button>}</div>
      {task.labels.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{task.labels.map(label => <LabelBadge key={label.id} label={label}/>)}</div>}
      <div className="mt-3 flex items-end justify-between gap-2"><div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5"><Priority task={task}/><TaskDeadline task={task}/><TaskPlanningBadges task={task}/>{task.checklistTotal > 0 && <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground" aria-label={`Checklist: ${task.checklistCompleted} de ${task.checklistTotal}`}><ListChecks size={13} aria-hidden="true"/>{task.checklistCompleted}/{task.checklistTotal}</span>}</div><Assignees task={task}/></div>
    </article>
  </div>;
}
function Column({ column, rows, visible, editable, open, create }: { column: BoardDetail['columns'][number]; rows: KanbanTask[]; visible: Set<string>; editable: boolean; open: (id: string) => void; create: () => void }) {
  const drop = useDroppable<TargetData>({ id: `column:${column.id}`, data: { columnId: column.id, index: rows.length }, accept: 'task', collisionPriority: 0, disabled: !editable });
  const shown = rows.filter(t => visible.has(t.id)).length;
  return <section ref={drop.ref} data-column-id={column.id} aria-label={column.name} className={`flex h-full min-h-0 min-w-0 flex-col rounded-xl border ${drop.isDropTarget ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/25'}`}>
    <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2">{column.isDone ? <CheckCircle2 size={15} className="shrink-0 text-success" aria-hidden="true"/> : <Circle size={15} className="shrink-0 text-muted-foreground" aria-hidden="true"/>}<h2 className="min-w-0 grow break-words text-sm font-medium">{column.name}</h2><span className="rounded-md bg-secondary/70 px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground" aria-label={`${shown} visibles de ${rows.length} tareas`}>{shown === rows.length ? rows.length : `${shown}/${rows.length}`}</span>{editable && <Button size="icon" variant="ghost" className="size-7 max-md:w-11" aria-label={`Añadir tarea a ${column.name}`} onClick={create}><Plus/></Button>}</header>
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-3" tabIndex={0} role="region" aria-label={`Tareas en ${column.name}`}>
      {rows.map((task, index) => visible.has(task.id) && <TaskCard key={task.id} task={task} index={index} editable={editable} open={() => open(task.id)}/>)}
      {!shown && <div className="mx-1 mt-3 rounded-lg border border-dashed border-border/70 px-3 py-8 text-center"><p className="text-xs leading-5 text-muted-foreground">{rows.length ? 'Ninguna tarea coincide con los filtros' : 'Sin tareas todavía'}</p>{editable && !rows.length && <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={create}><Plus aria-hidden="true"/>Crear tarea</Button>}</div>}
      {editable && shown > 0 && <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-muted-foreground" onClick={create}><Plus aria-hidden="true"/>Añadir tarea</Button>}
    </div>
  </section>;
}
export function TaskBoard({ board, rows, visible, editable, open, create, move }: { board: BoardDetail; rows: KanbanTask[]; visible: KanbanTask[]; editable: boolean; open: (id: string) => void; create: (column: string) => void; move: MoveTask }) {
  const ids = new Set(visible.map(t => t.id));
  return <DragDropProvider onDragEnd={event => {
    if (event.canceled || !editable) return;
    const { source, target } = event.operation; if (!source || !target) return;
    const data = target.data; if (typeof data.columnId !== 'string' || typeof data.index !== 'number' || !Number.isInteger(data.index)) return;
    const task = rows.find(t => t.id === source.id); if (!task) return;
    const originalIndex = rows.filter(t => t.columnId === task.columnId).sort(orderTasks).findIndex(t => t.id === task.id);
    const index = data.columnId === task.columnId && data.index > originalIndex ? data.index - 1 : data.index;
    if (data.columnId !== task.columnId || index !== originalIndex) move(task.id, data.columnId, index);
  }}><div className="grid min-h-0 flex-1 auto-cols-[minmax(264px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2" tabIndex={0} role="region" aria-label="Columnas del tablero">{board.columns.map(column => <Column key={column.id} column={column} rows={rows.filter(t => t.columnId === column.id).sort(orderTasks)} visible={ids} editable={editable} open={open} create={() => create(column.id)}/>)}</div></DragDropProvider>;
}
export function TaskList({ board, rows, visible, editable, open, move, sort }: { board: BoardDetail; rows: KanbanTask[]; visible: KanbanTask[]; editable: boolean; open: (id: string) => void; move: MoveTask; sort: string }) {
  const priorities = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
  const columnIndex = new Map(board.columns.map((c, i) => [c.id, i]));
  const sorted = [...visible].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title) || orderTasks(a, b);
    if (sort === 'priority') return priorities[a.priority] - priorities[b.priority] || orderTasks(a, b);
    if (sort === 'due') return (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) || orderTasks(a, b);
    return (columnIndex.get(a.columnId) ?? 0) - (columnIndex.get(b.columnId) ?? 0) || orderTasks(a, b);
  });
  return <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Lista de tareas"><table className="w-full min-w-[850px] text-left text-sm"><caption className="sr-only">Tareas del tablero. Cambia su estado con el selector; las flechas cambian el orden dentro del estado.</caption><thead className="sticky top-0 z-10 border-b border-border bg-muted text-xs text-muted-foreground"><tr>{['Tarea', 'Estado', 'Prioridad', 'Responsables', 'Fecha límite', 'Orden'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{sorted.map(task => {
    const sameColumn = rows.filter(t => t.columnId === task.columnId).sort(orderTasks); const index = sameColumn.findIndex(t => t.id === task.id);
    return <tr key={task.id} data-task-id={task.id} className="bg-card/50 hover:bg-muted/50"><td className="min-w-[220px] max-w-sm px-4 py-3"><button onClick={() => open(task.id)} className="break-words text-left font-medium hover:text-primary">{task.title}</button><div className="mt-1.5 flex flex-wrap gap-1">{task.labels.map(label => <LabelBadge key={label.id} label={label}/>)}<TaskPlanningBadges task={task}/></div></td><td className="w-48 px-4 py-3"><SelectInput aria-label={`Estado de ${task.title}`} disabled={!editable} value={task.columnId} onValueChange={selectedValue => move(task.id, selectedValue, rows.filter(t => t.columnId === selectedValue && t.id !== task.id).length)}>{board.columns.map(c => <SelectOption key={c.id} value={c.id}>{c.name}</SelectOption>)}</SelectInput></td><td className="px-4 py-3"><Priority task={task}/></td><td className="max-w-48 px-4 py-3 text-xs text-muted-foreground">{task.assignees.map(a => a.displayName).join(', ') || 'Sin responsable'}</td><td className="px-4 py-3"><TaskDeadline task={task}/>{task.dueAt === null && <span className="text-xs text-muted-foreground">Sin fecha</span>}</td><td className="px-3 py-3">{editable && sort === 'position' ? <div className="flex"><Button size="icon" variant="ghost" disabled={index === 0} aria-label={`Subir ${task.title}`} onClick={() => move(task.id, task.columnId, index - 1)}><ArrowUp/></Button><Button size="icon" variant="ghost" disabled={index === sameColumn.length - 1} aria-label={`Bajar ${task.title}`} onClick={() => move(task.id, task.columnId, index + 1)}><ArrowDown/></Button></div> : <span className="text-muted-foreground">—</span>}</td></tr>;
  })}</tbody></table>{!sorted.length && <p className="p-10 text-center text-sm text-muted-foreground">No hay tareas que coincidan con esta vista.</p>}</div>;
}
