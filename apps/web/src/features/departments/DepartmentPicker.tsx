import { SelectInput, SelectOption } from '@/components/common/select-input';
import { useState } from 'react';
import { departmentSchema } from '@uni/shared';
import { useAdminList, ListState, Pager } from '@/features/admin/common';
export function DepartmentPicker({ value, onChange, activeOnly = false, label = 'Departamento' }: { value: string; onChange: (id: string) => void; activeOnly?: boolean; label?: string }) {
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const query = useAdminList('/admin/departments', departmentSchema, { page, limit: 20, search, isActive: activeOnly ? 'true' : '' });
  return <div className="space-y-2"><label>{label}<input aria-label="Buscar departamento" type="search" maxLength={200} placeholder="Buscar departamento…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></label><SelectInput aria-label="Seleccionar departamento" value={value} onValueChange={selectedValue => onChange(selectedValue)}><SelectOption value="">Selecciona un departamento</SelectOption>{query.data?.data.map(d => <SelectOption key={d.id} value={d.id}>{d.name}{!d.isActive ? ' (inactivo)' : ''}</SelectOption>)}</SelectInput><ListState pending={query.isPending} error={query.error} empty={!query.data?.data.length} retry={() => void query.refetch()}/><Pager meta={query.data?.meta} onPage={setPage}/></div>;
}
