import { TaskCalendar } from './TaskCalendar';
import { BoardTemplates } from './BoardTemplates';
import { isTaskOverdue, usePlanningNow } from '@/features/tasks/TaskTiming';
import { addDays, isSameDay } from 'date-fns';
import { SelectInput, SelectOption } from '@/components/common/select-input';
import { useDeferredValue, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, CopyPlus, Columns3, List, Plus, Search, SlidersHorizontal, Tags, X } from 'lucide-react';
import { priorities, taskMoveResultSchema, type KanbanTask } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ListState, Notice } from '@/components/common/data-view';
import { api, ApiError } from '@/lib/api-client';
import { priorityLabels } from '@/features/tickets/tickets';
import { useStaffArea } from '@/features/staff/staff';
import { TaskForm } from '@/features/tasks/TaskForm';
import { TaskPanel } from '@/features/tasks/TaskPanel';
import { useBoard, useBoardTasks, useBoardLabels, boardTasksKey, optimisticMove } from './kanban';
import { BoardManager } from './BoardManager';
import { BoardLabels } from './BoardLabels';
import { TaskBoard, TaskList } from './TaskViews';

export function BoardPage() {
  const { id = '' } = useParams(); const area = useStaffArea(); const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const updateParam = (key: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next; }, { replace: true });
  const selected = params.get('taskId'); const setSelected = (value: string | null) => updateParam('taskId', value ?? '');
  const now = usePlanningNow();
  const archived = params.get('archived') === 'true'; const view = params.get('view') === 'calendar' ? 'calendar' : params.get('view') === 'list' ? 'list' : 'board';
  const dueFilter = params.get('due') ?? ''; const blockedOnly = params.get('blocked') === 'true';
  const search = params.get('search') ?? ''; const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const columnFilter = params.get('column') ?? ''; const priority = params.get('priority') ?? ''; const assignee = params.get('assignee') ?? ''; const label = params.get('label') ?? ''; const sort = params.get('sort') ?? 'position';
  const board = useBoard(id); const tasks = useBoardTasks(id, archived, !!board.data); const labels = useBoardLabels(id);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [templateManager, setTemplateManager] = useState(false);
  const [manager, setManager] = useState(false); const [labelManager, setLabelManager] = useState(false); const [createColumn, setCreateColumn] = useState<string | null>(null);
  const move=useMutation({mutationFn:async(v:{id:string;columnId:string;index:number})=>taskMoveResultSchema.parse((await api<unknown>(`/tasks/${v.id}/move`,{method:'POST',body:{targetColumnId:v.columnId,targetIndex:v.index}})).data),onMutate:async v=>{await client.cancelQueries({queryKey:boardTasksKey(id)});const previous=client.getQueryData<KanbanTask[]>(boardTasksKey(id));client.setQueryData(boardTasksKey(id),optimisticMove(previous??[],v.id,v.columnId,v.index).map(t=>t.id===v.id?{...t,isCompleted:board.data?.columns.find(c=>c.id===v.columnId)?.isDone??t.isCompleted}:t));return{previous};},onError:(_e,_v,context)=>{if(context?.previous)client.setQueryData(boardTasksKey(id),context.previous);},onSuccess:result=>{const positions=new Map(result.orders.flatMap(c=>c.items.map(t=>[t.id,{columnId:c.columnId,position:t.position}] as const)));client.setQueryData<KanbanTask[]>(boardTasksKey(id),rows=>rows?.map(t=>positions.has(t.id)?{...t,...positions.get(t.id)!,...(t.id===result.taskId?{updatedAt:result.updatedAt}:{})}:t));},onSettled:()=>{void client.invalidateQueries({queryKey:['kanban']});void client.invalidateQueries({queryKey:['task-links']});}});
  if (board.error instanceof ApiError && board.error.status === 404) return <section className="p-6"><h1 className="text-2xl font-semibold">Tablero no encontrado</h1><p className="mt-3 text-muted-foreground">No existe o no tienes una pertenencia válida.</p><Link className="mt-5 inline-block text-primary" to={`${area}/boards`}>Volver a tableros</Link></section>;
  if (!board.data) return <ListState pending={board.isPending} error={board.error} empty={false} retry={() => void board.refetch()}/>;
  const b = board.data; const editable = b.canEdit && !archived && !move.isPending && !tasks.isFetching; const rows = tasks.data ?? [];
  const visible = rows.filter(t => (!blockedOnly || (!t.isCompleted && t.blockedByCount > 0)) && (!dueFilter || (dueFilter === 'overdue' ? isTaskOverdue(t, now) : dueFilter === 'none' ? t.dueAt === null : dueFilter === 'today' ? t.dueAt !== null && !t.isCompleted && t.archivedAt === null && isSameDay(t.dueAt, now) : dueFilter === 'week' ? t.dueAt !== null && !t.isCompleted && t.archivedAt === null && t.dueAt >= now && t.dueAt <= addDays(now, 7).getTime() : true)) && (!deferredSearch || `${t.title} ${t.description ?? ''}`.toLocaleLowerCase().includes(deferredSearch)) && (!columnFilter || t.columnId === columnFilter) && (!priority || t.priority === priority) && (!label || (label === 'none' ? !t.labels.length : t.labels.some(l => l.id === label))) && (!assignee || (assignee === 'none' ? !t.assignees.length : t.assignees.some(a => a.id === assignee))));
  const people = [...new Map(rows.flatMap(t => t.assignees.map(a => [a.id, a] as const))).values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const hasFilters = !!(search || columnFilter || priority || label || assignee || dueFilter || blockedOnly);
  const doMove = (taskId: string, columnId: string, index: number) => move.mutate({ id: taskId, columnId, index });
  const filterCount = [columnFilter, priority, assignee, label, dueFilter, blockedOnly].filter(Boolean).length;
  return <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto" aria-label={`Tablero ${b.name}`}>
    <header className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
      <Link to={`${area}/boards`} className="mb-2 inline-flex min-h-8 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft size={13} aria-hidden="true"/>Tableros internos</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48"><h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">{b.name}</h1><p className="mt-1 text-xs text-muted-foreground">{b.departmentName}{b.isArchived ? ' · Tablero archivado' : !b.canEdit ? ' · Solo lectura' : ''}</p></div>
        <div className="flex flex-wrap items-center gap-1.5"><Button size="sm" variant="ghost" className="max-sm:w-11 max-sm:px-0" aria-label="Plantillas" onClick={() => setTemplateManager(true)}><CopyPlus aria-hidden="true"/><span className="hidden sm:inline">Plantillas</span></Button><Button size="sm" variant="ghost" className="max-sm:w-11 max-sm:px-0" aria-label={b.canManage ? 'Configurar' : 'Miembros'} title={b.canManage ? 'Configurar tablero' : 'Ver miembros'} onClick={() => setManager(true)}><SlidersHorizontal aria-hidden="true"/><span className="hidden sm:inline">{b.canManage ? 'Configurar' : 'Miembros'}</span></Button><Button size="sm" variant="ghost" className="max-sm:w-11 max-sm:px-0" aria-label="Categorías" title="Categorías del tablero" onClick={() => setLabelManager(true)}><Tags aria-hidden="true"/><span className="hidden sm:inline">Categorías</span></Button>{b.canEdit && b.columns.length > 0 && !archived && <Button size="sm" onClick={() => setCreateColumn(b.columns[0]!.id)}><Plus aria-hidden="true"/>Nueva tarea</Button>}</div>
      </div>
      {b.description && <p className="mt-2 max-h-16 max-w-3xl overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground" tabIndex={0} aria-label="Descripción del tablero">{b.description}</p>}
    </header>
    <div className="max-h-[45dvh] shrink-0 overflow-y-auto border-b border-border px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Vista de tareas" className="inline-flex shrink-0 gap-0.5 rounded-lg bg-muted p-0.5"><Button size="sm" variant={view === 'board' ? 'secondary' : 'ghost'} aria-pressed={view === 'board'} onClick={() => updateParam('view', '')}><Columns3 aria-hidden="true"/>Tablero</Button><Button size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} aria-pressed={view === 'list'} onClick={() => updateParam('view', 'list')}><List aria-hidden="true"/>Lista</Button><Button size="sm" variant={view === 'calendar' ? 'secondary' : 'ghost'} aria-pressed={view === 'calendar'} onClick={() => updateParam('view', 'calendar')}><CalendarDays aria-hidden="true"/>Calendario</Button></div>
        <span role="status" aria-live="polite" className="mr-auto hidden px-1 text-xs tabular-nums text-muted-foreground sm:inline">{visible.length} de {rows.length} tareas</span>
        <label className="relative min-w-0 flex-1 basis-36 sm:w-52 sm:flex-none sm:basis-auto"><span className="sr-only">Buscar tareas</span><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/><input className="mt-0! min-h-9! border-border! bg-muted/40! py-1.5! pl-8!" type="search" maxLength={200} value={search} placeholder="Buscar tareas…" onChange={e => updateParam('search', e.target.value)}/></label>
        <Button size="sm" variant={filtersOpen || filterCount ? 'secondary' : 'ghost'} aria-expanded={filtersOpen} aria-controls="board-filters" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal aria-hidden="true"/>Filtros{filterCount > 0 && <span className="rounded bg-primary/15 px-1.5 text-primary">{filterCount}</span>}</Button>
        <label className="min-w-28 flex-1 sm:flex-none"><span className="sr-only">Archivo de tareas</span><SelectInput className="mt-0! min-h-9! border-border! py-1.5! sm:w-auto!" value={archived ? 'true' : 'false'} disabled={move.isPending} onValueChange={selectedValue => updateParam('archived', selectedValue === 'true' ? 'true' : '')}><SelectOption value="false">Activas</SelectOption><SelectOption value="true">Archivadas · Solo lectura</SelectOption></SelectInput></label>
        {hasFilters && <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setParams(previous => { const next = new URLSearchParams(previous); ['search', 'column', 'priority', 'assignee', 'label', 'due', 'blocked'].forEach(k => next.delete(k)); return next; }, { replace: true })}><X aria-hidden="true"/>Limpiar</Button>}
        {view === 'list' && <label className="min-w-0 flex-1 sm:flex-none"><span className="sr-only">Ordenar tareas</span><SelectInput className="mt-0! min-h-9! border-border! py-1.5! sm:w-auto!" value={sort} onValueChange={selectedValue => updateParam('sort', selectedValue)}><SelectOption value="position">Orden del tablero</SelectOption><SelectOption value="priority">Prioridad</SelectOption><SelectOption value="due">Fecha límite</SelectOption><SelectOption value="title">Título</SelectOption></SelectInput></label>}
      </div>
      <div id="board-filters" hidden={!filtersOpen}>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs text-muted-foreground">Estado<SelectInput aria-label="Filtrar por estado" className="mt-1! border-border!" value={columnFilter} onValueChange={selectedValue => updateParam('column', selectedValue)}><SelectOption value="">Todos los estados</SelectOption>{b.columns.map(c => <SelectOption key={c.id} value={c.id}>{c.name}</SelectOption>)}</SelectInput></label>
          <label className="text-xs text-muted-foreground">Prioridad<SelectInput aria-label="Filtrar por prioridad" className="mt-1! border-border!" value={priority} onValueChange={selectedValue => updateParam('priority', selectedValue)}><SelectOption value="">Todas las prioridades</SelectOption>{priorities.map(p => <SelectOption key={p} value={p}>{priorityLabels[p]}</SelectOption>)}</SelectInput></label>
          <label className="text-xs text-muted-foreground">Responsable<SelectInput aria-label="Filtrar por responsable" className="mt-1! border-border!" value={assignee} onValueChange={selectedValue => updateParam('assignee', selectedValue)}><SelectOption value="">Todos los responsables</SelectOption><SelectOption value="none">Sin responsable</SelectOption>{people.map(p => <SelectOption key={p.id} value={p.id}>{p.displayName}</SelectOption>)}</SelectInput></label>
          <label className="text-xs text-muted-foreground">Categoría<SelectInput aria-label="Filtrar por categoría" className="mt-1! border-border!" value={label} onValueChange={selectedValue => updateParam('label', selectedValue)}><SelectOption value="">Todas las categorías</SelectOption><SelectOption value="none">Sin categoría</SelectOption>{labels.data?.map(l => <SelectOption key={l.id} value={l.id}>{l.name}</SelectOption>)}</SelectInput></label>
          <label className="text-xs text-muted-foreground">Vencimiento<SelectInput aria-label="Filtrar por vencimiento" className="mt-1! border-border!" value={dueFilter} onValueChange={v => updateParam('due', v)}><SelectOption value="">Todas las fechas</SelectOption><SelectOption value="overdue">Vencidas pendientes</SelectOption><SelectOption value="today">Vencen hoy</SelectOption><SelectOption value="week">Próximos 7 días</SelectOption><SelectOption value="none">Sin fecha</SelectOption></SelectInput></label>
          <label className="flex min-h-10 items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={blockedOnly} onChange={e => updateParam('blocked', e.target.checked ? 'true' : '')}/>Solo bloqueadas pendientes</label>
        </div>
      </div>
    </div>
    <div className="flex min-h-48 flex-1 flex-col overflow-auto px-4 pt-4 pb-2 sm:px-6">
    <Notice error={board.error ?? move.error ?? labels.error}/><ListState pending={tasks.isPending} error={tasks.error} empty={false} retry={() => void tasks.refetch()}/>
    {!tasks.isPending && !tasks.error && (view === 'calendar' ? <TaskCalendar rows={visible} monthValue={params.get('month') ?? ''} onMonth={value => updateParam('month', value)} open={setSelected} now={now}/> : view === 'board' ? <TaskBoard board={b} rows={rows} visible={visible} editable={editable} open={setSelected} create={setCreateColumn} move={doMove}/> : <TaskList board={b} rows={rows} visible={visible} editable={editable} open={setSelected} move={doMove} sort={sort}/>)}
    {!b.columns.length && <p className="mt-5 text-sm text-muted-foreground">Crea una columna desde Configurar para empezar.</p>}
    </div>
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground sm:px-6"><span>{archived || !b.canEdit ? 'Solo lectura' : view === 'board' ? 'Arrastra las tarjetas para mover y ordenar' : 'Abre una tarea para ver sus detalles'}</span><span role="status" className="shrink-0 tabular-nums">{move.isPending ? 'Guardando…' : <><span className="sm:hidden">{visible.length}/{rows.length} tareas</span><span className="hidden sm:inline">{b.columns.length} estados</span></>}</span></div>
    {templateManager && <BoardTemplates board={b} close={() => setTemplateManager(false)}/>}
    {manager && <BoardManager board={b} open close={() => setManager(false)}/>} {labelManager && <BoardLabels board={b} close={() => setLabelManager(false)}/>}
    <Dialog title="Nueva tarea" description="Define el trabajo, sus categorías y responsables. Puedes cambiar el estado después." open={createColumn !== null} onOpenChange={open => { if (!open) setCreateColumn(null); }}>{createColumn && <TaskForm key={createColumn} board={b} initialColumnId={createColumn} done={() => setCreateColumn(null)}/>}</Dialog>
    {selected && <TaskPanel key={selected} id={selected} board={b} rows={rows} close={() => setSelected(null)} openTask={setSelected}/>}
  </section>;
}
