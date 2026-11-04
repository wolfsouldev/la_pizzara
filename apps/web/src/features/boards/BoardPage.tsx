import { useDeferredValue, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Columns3, List, Plus, Search, SlidersHorizontal, Tags, X } from 'lucide-react';
import { priorities, taskMoveResultSchema, type KanbanTask } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Heading, ListState, Notice } from '@/components/common/data-view';
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
  const archived = params.get('archived') === 'true'; const view = params.get('view') === 'list' ? 'list' : 'board';
  const search = params.get('search') ?? ''; const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const columnFilter = params.get('column') ?? ''; const priority = params.get('priority') ?? ''; const assignee = params.get('assignee') ?? ''; const label = params.get('label') ?? ''; const sort = params.get('sort') ?? 'position';
  const board = useBoard(id); const tasks = useBoardTasks(id, archived, !!board.data); const labels = useBoardLabels(id);
  const [manager, setManager] = useState(false); const [labelManager, setLabelManager] = useState(false); const [createColumn, setCreateColumn] = useState<string | null>(null);
  const move=useMutation({mutationFn:async(v:{id:string;columnId:string;index:number})=>taskMoveResultSchema.parse((await api<unknown>(`/tasks/${v.id}/move`,{method:'POST',body:{targetColumnId:v.columnId,targetIndex:v.index}})).data),onMutate:async v=>{await client.cancelQueries({queryKey:boardTasksKey(id)});const previous=client.getQueryData<KanbanTask[]>(boardTasksKey(id));client.setQueryData(boardTasksKey(id),optimisticMove(previous??[],v.id,v.columnId,v.index));return{previous};},onError:(_e,_v,context)=>{if(context?.previous)client.setQueryData(boardTasksKey(id),context.previous);},onSuccess:result=>{const positions=new Map(result.orders.flatMap(c=>c.items.map(t=>[t.id,{columnId:c.columnId,position:t.position}] as const)));client.setQueryData<KanbanTask[]>(boardTasksKey(id),rows=>rows?.map(t=>positions.has(t.id)?{...t,...positions.get(t.id)!,...(t.id===result.taskId?{updatedAt:result.updatedAt}:{})}:t));},onSettled:()=>{void client.invalidateQueries({queryKey:['kanban']});void client.invalidateQueries({queryKey:['task-links']});}});
  if (board.error instanceof ApiError && board.error.status === 404) return <section><h1 className="text-2xl font-semibold">Tablero no encontrado</h1><p className="mt-3 text-muted-foreground">No existe o no tienes una pertenencia válida.</p><Link className="mt-5 inline-block text-primary" to={`${area}/boards`}>Volver a tableros</Link></section>;
  if (!board.data) return <ListState pending={board.isPending} error={board.error} empty={false} retry={() => void board.refetch()}/>;
  const b = board.data; const editable = b.canEdit && !archived && !move.isPending && !tasks.isFetching; const rows = tasks.data ?? [];
  const visible = rows.filter(t => (!deferredSearch || `${t.title} ${t.description ?? ''}`.toLocaleLowerCase().includes(deferredSearch)) && (!columnFilter || t.columnId === columnFilter) && (!priority || t.priority === priority) && (!label || (label === 'none' ? !t.labels.length : t.labels.some(l => l.id === label))) && (!assignee || (assignee === 'none' ? !t.assignees.length : t.assignees.some(a => a.id === assignee))));
  const people = [...new Map(rows.flatMap(t => t.assignees.map(a => [a.id, a] as const))).values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const hasFilters = !!(search || columnFilter || priority || label || assignee);
  const doMove = (taskId: string, columnId: string, index: number) => move.mutate({ id: taskId, columnId, index });
  return <section className="min-w-0">
    <Link to={`${area}/boards`} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15}/>Tableros internos</Link>
    <Heading title={b.name} description={`${b.departmentName} · ${b.isArchived ? 'Tablero archivado' : b.canEdit ? 'Espacio de trabajo interno' : 'Solo lectura'}`}><div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setManager(true)}><SlidersHorizontal/>{b.canManage ? 'Configurar' : 'Miembros'}</Button><Button variant="outline" onClick={() => setLabelManager(true)}><Tags/>Categorías</Button>{b.canEdit && b.columns.length > 0 && !archived && <Button onClick={() => setCreateColumn(b.columns[0]!.id)}><Plus/>Nueva tarea</Button>}</div></Heading>
    {b.description && <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm text-muted-foreground">{b.description}</p>}
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div role="group" aria-label="Vista de tareas" className="inline-flex gap-1 rounded-lg border border-border bg-muted/50 p-1"><Button size="sm" variant={view === 'board' ? 'secondary' : 'ghost'} aria-pressed={view === 'board'} onClick={() => updateParam('view', '')}><Columns3/>Tablero</Button><Button size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} aria-pressed={view === 'list'} onClick={() => updateParam('view', 'list')}><List/>Lista</Button></div>
      <div className="flex flex-wrap items-center gap-3"><span role="status" aria-live="polite" className="text-xs tabular-nums text-muted-foreground">{visible.length} de {rows.length} tareas</span>{move.isPending && <span role="status" className="text-xs text-primary">Guardando movimiento…</span>}<label className="sr-only" htmlFor="task-archive">Archivo de tareas</label><select id="task-archive" className="w-auto!" value={archived ? 'true' : 'false'} disabled={move.isPending} onChange={e => updateParam('archived', e.target.value === 'true' ? 'true' : '')}><option value="false">Activas</option><option value="true">Archivadas · Solo lectura</option></select></div>
    </div>
    <div className="my-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <label className="relative sm:col-span-2 xl:col-span-1"><span className="sr-only">Buscar tareas</span><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"/><input className="mt-0! pl-9!" type="search" maxLength={200} value={search} placeholder="Buscar tareas…" onChange={e => updateParam('search', e.target.value)}/></label>
      <label><span className="sr-only">Filtrar por estado</span><select className="mt-0!" value={columnFilter} onChange={e => updateParam('column', e.target.value)}><option value="">Todos los estados</option>{b.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label><span className="sr-only">Filtrar por prioridad</span><select className="mt-0!" value={priority} onChange={e => updateParam('priority', e.target.value)}><option value="">Prioridad: todas</option>{priorities.map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}</select></label>
      <label><span className="sr-only">Filtrar por responsable</span><select className="mt-0!" value={assignee} onChange={e => updateParam('assignee', e.target.value)}><option value="">Responsable: todos</option><option value="none">Sin responsable</option>{people.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}</select></label>
      <label><span className="sr-only">Filtrar por categoría</span><select className="mt-0!" value={label} onChange={e => updateParam('label', e.target.value)}><option value="">Categoría: todas</option><option value="none">Sin categoría</option>{labels.data?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      {view === 'list' ? <label><span className="sr-only">Ordenar tareas</span><select className="mt-0!" value={sort} onChange={e => updateParam('sort', e.target.value)}><option value="position">Orden del tablero</option><option value="priority">Prioridad</option><option value="due">Fecha límite</option><option value="title">Título</option></select></label> : <p className="self-center text-xs text-muted-foreground">{editable ? 'Arrastra para mover y ordenar' : 'Vista de solo lectura'}</p>}
    </div>
    {hasFilters && <Button variant="ghost" size="sm" className="mb-3 text-muted-foreground" onClick={() => setParams(previous => { const next = new URLSearchParams(previous); ['search', 'column', 'priority', 'assignee', 'label'].forEach(k => next.delete(k)); return next; }, { replace: true })}><X/>Limpiar filtros</Button>}
    <Notice error={board.error ?? move.error ?? labels.error}/><ListState pending={tasks.isPending} error={tasks.error} empty={false} retry={() => void tasks.refetch()}/>
    {!tasks.isPending && !tasks.error && (view === 'board' ? <TaskBoard board={b} rows={rows} visible={visible} editable={editable} open={setSelected} create={setCreateColumn} move={doMove}/> : <TaskList board={b} rows={rows} visible={visible} editable={editable} open={setSelected} move={doMove} sort={sort}/>)}
    {!b.columns.length && <p className="mt-5 text-sm text-muted-foreground">Crea una columna desde Configurar para empezar.</p>}
    {manager && <BoardManager board={b} open close={() => setManager(false)}/>} {labelManager && <BoardLabels board={b} close={() => setLabelManager(false)}/>}
    <Dialog title="Nueva tarea" description="Define el trabajo, sus categorías y responsables. Puedes cambiar el estado después." open={createColumn !== null} onOpenChange={open => { if (!open) setCreateColumn(null); }}>{createColumn && <TaskForm key={createColumn} board={b} initialColumnId={createColumn} done={() => setCreateColumn(null)}/>}</Dialog>
    {selected && <TaskPanel key={selected} id={selected} board={b} rows={rows} close={() => setSelected(null)}/>}
  </section>;
}
