import { FormSelect, SelectOption, SelectInput } from '@/components/common/select-input';
import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { boardCreateSchema, type BoardCreate, departmentSchema } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Heading, ListState, Notice, Pager } from '@/components/common/data-view';
import { useSession } from '@/features/auth/auth';
import { useAdminList } from '@/features/admin/common';
import { useStaffArea } from '@/features/staff/staff';
import { useBoards, useKanbanMutation } from './kanban';
function CreateBoard({ close }: { close: () => void }) {
  const [departmentPage, setDepartmentPage] = useState(1);
  const [search, setSearch] = useState(''); const options = useAdminList('/admin/departments', departmentSchema, { isActive: 'true', limit: 20, search, page: departmentPage });
  const form = useForm<BoardCreate>({ resolver: zodResolver(boardCreateSchema), defaultValues: { name: '', description: '', departmentId: '' } }); const mutation = useKanbanMutation(() => close());
  return <form className="space-y-4" onSubmit={form.handleSubmit(body => mutation.mutate({ path: '/boards', method: 'POST', body }))}><Notice error={mutation.error ?? options.error}/><fieldset disabled={mutation.isPending} className="space-y-4"><label>Nombre del tablero<input maxLength={120} {...form.register('name')}/><span className="text-xs text-destructive">{form.formState.errors.name?.message}</span></label><label>Descripción<textarea rows={3} maxLength={2000} {...form.register('description')}/></label><label>Buscar departamento<input type="search" maxLength={200} value={search} onChange={e => { setSearch(e.target.value); setDepartmentPage(1); form.setValue('departmentId', ''); }}/></label><label>Departamento<FormSelect control={form.control} name="departmentId"><SelectOption value="">Selecciona un departamento activo</SelectOption>{options.data?.data.map(d => <SelectOption key={d.id} value={d.id}>{d.name}</SelectOption>)}</FormSelect><span className="text-xs text-destructive">{form.formState.errors.departmentId?.message}</span></label><Pager meta={options.data?.meta} onPage={page => { setDepartmentPage(page); form.setValue('departmentId', ''); }}/><Button type="submit">{mutation.isPending ? 'Creando…' : 'Crear tablero'}</Button></fieldset></form>;
}
export function BoardsPage() {
  const area = useStaffArea(); const session = useSession();const [page,setPage]=useState(1);const[search,setSearch]=useState('');const[isArchived,setArchived]=useState('false');const[create,setCreate]=useState(false);const query=useBoards({page,search,isArchived});
  return <section><Heading title="Tableros internos" description="Organiza el trabajo del equipo en espacios privados por departamento.">{session.data?.role === 'ADMIN' && <Button onClick={()=>setCreate(true)}>Nuevo tablero</Button>}</Heading><div className="my-6 grid gap-4 sm:grid-cols-2"><label>Buscar tablero<input type="search" maxLength={200} value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><label>Archivo<SelectInput value={isArchived} onValueChange={selectedValue =>{setArchived(selectedValue);setPage(1);}}><SelectOption value="false">Activos</SelectOption><SelectOption value="true">Archivados · Solo lectura</SelectOption></SelectInput></label></div><ListState pending={query.isPending} error={query.error} empty={!query.data?.data.length} retry={()=>void query.refetch()}/><div className="grid gap-4 md:grid-cols-2">{query.data?.data.map(board=><Link key={board.id} to={`${area}/boards/${board.id}`} className="rounded-xl border border-border bg-card p-5 hover:border-primary"><p className="text-xs text-muted-foreground">{board.departmentName} · {board.permission}</p><h2 className="mt-2 break-words text-lg font-semibold">{board.name}</h2><p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{board.description ?? 'Sin descripción'}</p>{board.isArchived&&<p className="mt-3 text-xs text-warning">Archivado</p>}</Link>)}</div><div className="mt-5"><Pager meta={query.data?.meta} onPage={setPage}/></div><Dialog title="Crear tablero" description="Se crearán cuatro columnas iniciales. El departamento no se puede cambiar después." open={create} onOpenChange={setCreate}>{create&&<CreateBoard close={()=>setCreate(false)}/>}</Dialog></section>;
}
