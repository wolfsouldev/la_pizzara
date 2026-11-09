import { FormSelect, SelectOption, SelectInput } from '@/components/common/select-input';
import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { StaffTicketDetail } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ListState, Notice, Pager } from '@/components/common/data-view';
import { useBoards, useBoardTasks } from '@/features/boards/kanban';
import { useStaffArea } from '@/features/staff/staff';
import { TaskForm } from './TaskForm';
import { useLinkedTasks, useLinkBoard, useLinkMutation } from './task-links';
const schema = z.strictObject({ taskId: z.uuid() });
function ExistingTask({ boardId, ticketId, done }: { boardId: string; ticketId: string; done: () => void }) {
  const tasks = useBoardTasks(boardId, false, true); const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { taskId: '' } });
  const mutation = useLinkMutation(done);
  return <form className="space-y-4" onSubmit={form.handleSubmit(({taskId}) => mutation.mutate({ path: `/tasks/${taskId}/tickets`, method: 'POST', body: { ticketId } }))}><Notice error={mutation.error??tasks.error}/><label>Tarea existente<FormSelect control={form.control} name="taskId"><SelectOption value="">Selecciona una tarea activa</SelectOption>{tasks.data?.map(t=><SelectOption key={t.id} value={t.id}>{t.title}</SelectOption>)}</FormSelect><span className="text-xs text-destructive">{form.formState.errors.taskId?.message}</span></label><Button type="submit" disabled={mutation.isPending||tasks.isPending}>Vincular tarea</Button></form>;
}
function ChooseTask({ ticket, mode, done }: { ticket: StaffTicketDetail; mode: 'create'|'link'; done: () => void }) {
  const [page,setPage]=useState(1); const [search,setSearch]=useState(''); const [boardId,setBoardId]=useState(''); const boards=useBoards({ departmentId: ticket.department.id, isArchived: 'false', search, page }); const selected=useLinkBoard(boardId);
  return <div className="space-y-5"><label>Buscar tablero<input type="search" value={search} maxLength={200} onChange={e=>{setSearch(e.target.value);setPage(1);setBoardId('');}}/></label><label>Tablero autorizado del mismo departamento<SelectInput name="linkBoardId" value={boardId} onValueChange={selectedValue =>setBoardId(selectedValue)}><SelectOption value="">Selecciona un tablero con permiso EDIT o MANAGE</SelectOption>{boards.data?.data.filter(b=>b.permission!=='VIEW').map(b=><SelectOption key={b.id} value={b.id}>{b.name}</SelectOption>)}</SelectInput></label><ListState pending={boards.isPending} error={boards.error} empty={!boards.data?.data.length} retry={()=>void boards.refetch()}/><Pager meta={boards.data?.meta} onPage={p=>{setPage(p);setBoardId('');}}/><Notice error={selected.error}/>{selected.data?.canEdit&&(mode==='create'?<TaskForm key={boardId} board={selected.data} sourceTicket={ticket} done={done}/>:<ExistingTask key={boardId} boardId={boardId} ticketId={ticket.id} done={done}/>)}{boardId&&selected.data&&!selected.data.canEdit&&<p className="text-sm text-warning">Ya no tienes permiso de edición en este tablero.</p>}</div>;
}
export function TicketTasks({ ticket }: { ticket: StaffTicketDetail }) {
  const [page,setPage]=useState(1);const [mode,setMode]=useState<'create'|'link'|null>(null);const list=useLinkedTasks(ticket.id,page);const area=useStaffArea();const mutation=useLinkMutation();
  return <article className="rounded-xl border border-border bg-card p-6"><h2 className="font-semibold">Tareas internas relacionadas</h2><p className="mt-2 text-xs text-muted-foreground">Solo se muestran tableros a los que tienes acceso. Estas relaciones nunca aparecen en el portal del solicitante. Para cambiar el departamento, retira primero todos los vínculos.</p>{ticket.canEdit&&<div className="my-4 flex flex-wrap gap-2"><Button onClick={()=>setMode('create')}>Crear tarea a partir de este ticket</Button><Button variant="outline" onClick={()=>setMode('link')}>Vincular tarea existente</Button></div>}<Notice error={mutation.error}/><ListState pending={list.isPending} error={list.error} empty={!list.data?.data.length} retry={()=>void list.refetch()}/><ul className="my-4 space-y-3">{list.data?.data.map(t=><li key={t.taskId} className="rounded-lg border border-border p-4"><Link to={`${area}/boards/${t.boardId}?taskId=${t.taskId}`} className="break-words text-sm font-medium text-primary">{t.title}</Link><p className="mt-1 text-xs text-muted-foreground">{t.boardName} · {t.columnName}{(t.archivedAt!==null||t.boardArchived)&&' · Archivado'}</p>{t.canUnlink&&<Button variant="ghost" className="mt-2" disabled={mutation.isPending} onClick={()=>{if(confirm('¿Retirar este vínculo privado? La tarea y el ticket se conservan.'))mutation.mutate({path:`/tasks/${t.taskId}/tickets/${ticket.id}`,method:'DELETE'});}}>Desvincular tarea</Button>}</li>)}</ul><Pager meta={list.data?.meta} onPage={setPage}/><Dialog title={mode==='create'?'Crear tarea desde ticket':'Vincular tarea existente'} description="El ticket no cambia de estado. La relación es privada y exige permisos de edición tanto en el ticket como en el tablero." open={mode!==null} onOpenChange={v=>{if(!v)setMode(null);}}>{mode&&<ChooseTask key={mode} ticket={ticket} mode={mode} done={()=>{setMode(null);setPage(1);}}/>}</Dialog></article>;
}
