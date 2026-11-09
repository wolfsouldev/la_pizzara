import { useState } from 'react';
import { departmentSchema, type Department } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { OrganizationForm } from '@/features/admin/OrganizationForm';
import { useAdminList, useAdminMutation, Heading, Filters, ListState, Pager, Notice, Status, tableClass } from '@/features/admin/common';
import { MembersPanel } from './MembersPanel';
import { useSession } from '@/features/auth/auth';
export function DepartmentsPage() {
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [active, setActive] = useState(''); const [editing, setEditing] = useState<Department | 'new' | null>(null); const [members, setMembers] = useState<Department | null>(null);
  const session = useSession();
  const query = useAdminList('/admin/departments', departmentSchema, { page, search, isActive: active }); const mutation = useAdminMutation(() => setEditing(null));
  return <section><Heading title="Departamentos" description="Organiza los equipos de atención y sus técnicos. Desactivar conserva las categorías y las relaciones históricas."><Button onClick={() => { mutation.reset(); setEditing('new'); setMembers(null); }}>Crear departamento</Button></Heading>
    {editing && <OrganizationForm key={editing === 'new' ? 'new' : editing.id} title={editing === 'new' ? 'Nuevo departamento' : 'Editar departamento'} initial={editing === 'new' ? undefined : { ...editing, description: editing.description ?? '' }} pending={mutation.isPending} error={mutation.error} onCancel={() => setEditing(null)} onSave={body => { if (editing !== 'new' && editing.isActive && body.isActive === false && !confirm('¿Desactivar el departamento? Sus categorías dejarán de aparecer en el catálogo.')) return; mutation.mutate({ path: `/admin/departments${editing === 'new' ? '' : `/${editing.id}`}`, method: editing === 'new' ? 'POST' : 'PATCH', body }); }}/>}
    <Filters search={search} active={active} onSearch={v => { setSearch(v); setPage(1); }} onActive={v => { setActive(v); setPage(1); }}/>
    {!editing && <Notice error={mutation.error} success={mutation.isSuccess && 'Departamento guardado.'}/>}
    <div className="rounded-xl border border-border bg-card"><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Departamento</th><th>Identificador</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{query.data?.data.map(d => <tr key={d.id}><td className="min-w-48 font-medium">{d.name}<p className="max-w-sm text-xs font-normal text-muted-foreground">{d.description}</p></td><td>{d.slug}</td><td><Status active={d.isActive}/></td><td><div className="flex gap-2"><Button variant="outline" onClick={() => { mutation.reset(); setEditing(d); setMembers(null); }}>Editar</Button>{session.data?.role === 'SUPER_ADMIN' && <Button variant="ghost" onClick={() => { setMembers(d); setEditing(null); }}>Técnicos</Button>}</div></td></tr>)}</tbody></table></div><ListState pending={query.isPending} error={query.error} empty={!query.data?.data.length} retry={() => void query.refetch()}/><Pager meta={query.data?.meta} onPage={setPage}/></div>
    {members && <MembersPanel key={members.id} department={members} onClose={() => setMembers(null)}/>}
  </section>;
}
