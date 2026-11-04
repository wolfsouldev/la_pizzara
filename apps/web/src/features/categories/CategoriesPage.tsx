import { useState } from 'react';
import { categorySchema, categoryCreateSchema, type Category } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { OrganizationForm } from '@/features/admin/OrganizationForm';
import { DepartmentPicker } from '@/features/departments/DepartmentPicker';
import { useAdminList, useAdminMutation, Heading, Filters, ListState, Pager, Notice, Status, tableClass } from '@/features/admin/common';
export function CategoriesPage() {
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [active, setActive] = useState(''); const [departmentId, setDepartmentId] = useState(''); const [targetDepartment, setTargetDepartment] = useState(''); const [validation, setValidation] = useState<Error | null>(null); const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const query = useAdminList('/admin/categories', categorySchema, { page, search, isActive: active, departmentId }); const mutation = useAdminMutation(() => { setEditing(null); setValidation(null); });
  return <section><Heading title="Categorías" description="Cada categoría envía las solicitudes a un departamento. Su departamento no se cambia al editar para conservar la identidad histórica."><Button onClick={() => { mutation.reset(); setValidation(null); setTargetDepartment(''); setEditing('new'); }}>Crear categoría</Button></Heading>
    {editing && <OrganizationForm key={editing === 'new' ? 'new' : editing.id} title={editing === 'new' ? 'Nueva categoría' : 'Editar categoría'} initial={editing === 'new' ? undefined : { ...editing, description: editing.description ?? '' }} pending={mutation.isPending} error={validation ?? mutation.error} onCancel={() => setEditing(null)} onSave={values => {
      if (editing !== 'new' && editing.isActive && values.isActive === false && !confirm('¿Desactivar esta categoría? Se conserva su información histórica.')) return;
      const body = editing === 'new' ? { ...values, departmentId: targetDepartment } : values;
      if (editing === 'new') { const parsed = categoryCreateSchema.safeParse(body); if (!parsed.success) { setValidation(new Error('Selecciona un departamento activo válido.')); return; } }
      setValidation(null); mutation.mutate({ path: `/admin/categories${editing === 'new' ? '' : `/${editing.id}`}`, method: editing === 'new' ? 'POST' : 'PATCH', body });
    }}>{editing === 'new' ? <div className="sm:col-span-2"><DepartmentPicker value={targetDepartment} onChange={setTargetDepartment} activeOnly/></div> : <p className="sm:col-span-2 text-sm text-muted-foreground">Departamento: {editing.departmentName}</p>}</OrganizationForm>}
    <Filters search={search} active={active} onSearch={v => { setSearch(v); setPage(1); }} onActive={v => { setActive(v); setPage(1); }}/><div className="mb-5 max-w-xl"><DepartmentPicker label="Filtrar por departamento" value={departmentId} onChange={v => { setDepartmentId(v); setPage(1); }}/><Button variant="ghost" className="mt-2" onClick={() => { setDepartmentId(''); setPage(1); }}>Todos los departamentos</Button></div>
    {!editing && <Notice error={mutation.error} success={mutation.isSuccess && 'Categoría guardada.'}/>}
    <div className="rounded-xl border border-border bg-card"><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Categoría</th><th>Departamento</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{query.data?.data.map(c => <tr key={c.id}><td className="min-w-44 font-medium">{c.name}<span className="block text-xs font-normal text-muted-foreground">{c.slug}</span><p className="max-w-sm text-xs font-normal text-muted-foreground">{c.description}</p></td><td>{c.departmentName}</td><td><Status active={c.isActive}/></td><td><Button variant="outline" onClick={() => { mutation.reset(); setValidation(null); setEditing(c); }}>Editar</Button></td></tr>)}</tbody></table></div><ListState pending={query.isPending} error={query.error} empty={!query.data?.data.length} retry={() => void query.refetch()}/><Pager meta={query.data?.meta} onPage={setPage}/></div>
  </section>;
}
