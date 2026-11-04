import { useState } from 'react';
import { Link } from 'react-router';
import { priorities, ticketStatuses } from '@uni/shared';
import { Heading, ListState, Notice, Pager, tableClass } from '@/components/common/data-view';
import { TicketStatusBadge } from '@/features/tickets/TicketStatusBadge';
import { dateTime, statusLabels, priorityLabels } from '@/features/tickets/tickets';
import { useStaffArea, useStaffOptions, useStaffTickets } from './staff';
export function StaffTicketsPage() {
  const area = useStaffArea(); const options = useStaffOptions();
  const [page, setPage] = useState(1); const [filters, setFilters] = useState({ search: '', status: '', priority: '', departmentId: '', categoryId: '', assignedToId: '' });
  const query = useStaffTickets({ ...filters, assignedToId: filters.assignedToId === 'unassigned' ? undefined : filters.assignedToId, unassigned: filters.assignedToId === 'unassigned' ? 'true' : undefined, page });
  const set = (key: keyof typeof filters, value: string) => { setFilters(v => ({ ...v, [key]: value, ...(key === 'departmentId' ? { categoryId: '', assignedToId: '' } : {}) })); setPage(1); };
  const members = options.data?.assignees.filter(m => !filters.departmentId || m.departmentId === filters.departmentId).filter((m, i, all) => all.findIndex(n => n.id === m.id) === i) ?? [];
  return <section><Heading title="Atención de tickets" description="Bandeja de los departamentos autorizados. Solo el responsable o un administrador puede modificar una solicitud; la asignación es administrativa."/>
    <Notice error={options.error}/><div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <label>Buscar<input type="search" maxLength={200} placeholder="Número, título o descripción" value={filters.search} onChange={e => set('search', e.target.value)}/></label>
    <label>Departamento<select value={filters.departmentId} onChange={e => set('departmentId', e.target.value)}><option value="">Todos los autorizados</option>{options.data?.departments.map(d => <option key={d.id} value={d.id}>{d.name}{!d.isActive && ' (inactivo)'}</option>)}</select></label>
    <label>Categoría<select value={filters.categoryId} onChange={e => set('categoryId', e.target.value)}><option value="">Todas</option>{options.data?.categories.filter(c => !filters.departmentId || c.departmentId === filters.departmentId).map(c => <option key={c.id} value={c.id}>{c.name}{!c.isActive && ' (inactiva)'}</option>)}</select></label>
    <label>Estado<select value={filters.status} onChange={e => set('status', e.target.value)}><option value="">Todos</option>{ticketStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label>
    <label>Prioridad<select value={filters.priority} onChange={e => set('priority', e.target.value)}><option value="">Todas</option>{priorities.map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}</select></label>
    <label>Responsable<select value={filters.assignedToId} onChange={e => set('assignedToId', e.target.value)}><option value="">Todos</option><option value="unassigned">Sin asignar</option>{members.map(m => <option key={m.id} value={m.id}>{m.displayName}{!m.isActive && ' (inactivo)'}</option>)}</select></label></div>
    <div className="overflow-hidden rounded-xl border border-border bg-card"><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Solicitud</th><th>Solicitante</th><th>Departamento / categoría</th><th>Estado / prioridad</th><th>Responsable</th><th>Actualizada</th></tr></thead><tbody>{query.data?.data.map(t => <tr key={t.id}><td className="min-w-52"><Link to={`${area}/tickets/${t.id}`} className="font-medium text-primary"><span className="block font-mono text-xs text-muted-foreground">{t.publicNumber}</span>{t.title}</Link></td><td>{t.requester.displayName}</td><td>{t.department.name}<span className="block text-xs text-muted-foreground">{t.category.name}</span></td><td><TicketStatusBadge status={t.status}/><p className="mt-2 text-xs">{priorityLabels[t.priority]}</p></td><td>{t.assignee?.displayName ?? 'Sin asignar'}</td><td className="whitespace-nowrap text-xs">{dateTime(t.updatedAt)}</td></tr>)}</tbody></table></div><ListState pending={query.isPending} error={query.error} empty={!query.data?.data.length} retry={() => void query.refetch()}/><Pager meta={query.data?.meta} onPage={setPage}/></div>
  </section>;
}
