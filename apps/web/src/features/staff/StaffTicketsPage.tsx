import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { priorities, ticketStatuses, type Priority } from '@uni/shared';
import { ArrowDown, ArrowRight, Circle, Flag, LoaderCircle, RefreshCw, Search, SlidersHorizontal, Ticket, UserRound, X } from 'lucide-react';
import { useSession } from '@/features/auth/auth';
import { ListState, Notice, Pager } from '@/components/common/data-view';
import { SelectInput, SelectOption } from '@/components/common/select-input';
import { Button } from '@/components/ui/button';
import { TicketStatusBadge } from '@/features/tickets/TicketStatusBadge';
import { dateTime, statusLabels, priorityLabels } from '@/features/tickets/tickets';
import { useStaffArea, useStaffOptions, useStaffTickets } from './staff';

const emptyFilters = { search: '', status: '', priority: '', departmentId: '', categoryId: '', assignedToId: '' };
type FilterKey = keyof typeof emptyFilters;
const priorityColors: Record<Priority, string> = { LOW: 'text-muted-foreground', NORMAL: 'text-foreground', HIGH: 'text-warning', URGENT: 'text-destructive' };

export function StaffTicketsPage({ assignedToMe = false }: { assignedToMe?: boolean }) {
  const area = useStaffArea();
  const options = useStaffOptions();
  const session = useSession();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(emptyFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => { const timeout = setTimeout(() => setSearch(filters.search.trim()), 250); return () => clearTimeout(timeout); }, [filters.search]);
  const query = useStaffTickets({ ...filters, search, assignedToId: assignedToMe ? session.data?.id : filters.assignedToId === 'unassigned' ? undefined : filters.assignedToId, unassigned: !assignedToMe && filters.assignedToId === 'unassigned' ? 'true' : undefined, page }, !assignedToMe || !!session.data?.id);
  const set = (key: FilterKey, value: string) => { setFilters(previous => ({ ...previous, [key]: value, ...(key === 'departmentId' ? { categoryId: '', assignedToId: '' } : {}) })); setPage(1); };
  const clear = () => { setFilters(emptyFilters); setSearch(''); setPage(1); };
  const members = options.data?.assignees.filter(m => !filters.departmentId || m.departmentId === filters.departmentId).filter((m, i, all) => all.findIndex(n => n.id === m.id) === i) ?? [];
  const chips: { key: FilterKey; label: string }[] = [
    ...(filters.search ? [{ key: 'search' as const, label: `Búsqueda: ${filters.search}` }] : []),
    ...(filters.status ? [{ key: 'status' as const, label: statusLabels[filters.status as keyof typeof statusLabels] }] : []),
    ...(filters.priority ? [{ key: 'priority' as const, label: `Prioridad: ${priorityLabels[filters.priority as Priority]}` }] : []),
    ...(filters.departmentId ? [{ key: 'departmentId' as const, label: options.data?.departments.find(d => d.id === filters.departmentId)?.name ?? 'Departamento' }] : []),
    ...(filters.categoryId ? [{ key: 'categoryId' as const, label: options.data?.categories.find(c => c.id === filters.categoryId)?.name ?? 'Categoría' }] : []),
    ...(!assignedToMe && filters.assignedToId ? [{ key: 'assignedToId' as const, label: filters.assignedToId === 'unassigned' ? 'Sin asignar' : members.find(m => m.id === filters.assignedToId)?.displayName ?? 'Responsable' }] : []),
  ];
  const advancedCount = [filters.departmentId, filters.categoryId, !assignedToMe && filters.assignedToId].filter(Boolean).length;
  const rows = query.data?.data ?? [];

  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <span className="mt-1 hidden size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary sm:flex">{assignedToMe ? <UserRound className="size-5" aria-hidden="true"/> : <Ticket className="size-5" aria-hidden="true"/>}</span>
        <div><p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">HELP DESK</p><h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{assignedToMe ? 'Mis tickets' : 'Todos los tickets'}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{assignedToMe ? 'Tu bandeja de trabajo: solicitudes que tienes asignadas para atender.' : 'Organiza y da seguimiento a las solicitudes de tus departamentos autorizados.'}</p></div>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} aria-hidden="true"/>Actualizar</Button>
    </header>

    <nav aria-label="Bandeja de tickets" className="flex gap-1 border-b border-border">
      {[{ to: `${area}/tickets`, label: 'Todos los tickets', icon: Ticket }, { to: `${area}/tickets/mine`, label: 'Mis tickets', icon: UserRound }].map(item => <NavLink key={item.to} to={item.to} end className={({ isActive }) => `inline-flex min-h-11 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><item.icon className="size-4" aria-hidden="true"/>{item.label}</NavLink>)}
    </nav>

    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-end gap-3 p-4">
        <label htmlFor="ticket-search" className="relative min-w-0 flex-1 basis-full sm:basis-64"><span className="sr-only">Buscar tickets</span><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/><input id="ticket-search" type="search" maxLength={200} className="mt-0! border-border! bg-background/60! pl-10!" placeholder="Buscar por número, título o descripción…" value={filters.search} onChange={event => set('search', event.target.value)}/></label>
        <label htmlFor="ticket-status" className="min-w-0 flex-1 basis-36 sm:max-w-48"><span className="sr-only">Estado</span><SelectInput id="ticket-status" className="mt-0! bg-background/60" value={filters.status} onValueChange={value => set('status', value)}><SelectOption value="">Todos los estados</SelectOption>{ticketStatuses.map(status => <SelectOption key={status} value={status}>{statusLabels[status]}</SelectOption>)}</SelectInput></label>
        <label htmlFor="ticket-priority" className="min-w-0 flex-1 basis-36 sm:max-w-48"><span className="sr-only">Prioridad</span><SelectInput id="ticket-priority" className="mt-0! bg-background/60" value={filters.priority} onValueChange={value => set('priority', value)}><SelectOption value="">Todas las prioridades</SelectOption>{priorities.map(priority => <SelectOption key={priority} value={priority}>{priorityLabels[priority]}</SelectOption>)}</SelectInput></label>
        <Button type="button" variant={advancedOpen || advancedCount ? 'secondary' : 'outline'} aria-expanded={advancedOpen} aria-controls="ticket-advanced-filters" onClick={() => setAdvancedOpen(open => !open)}><SlidersHorizontal aria-hidden="true"/>Más filtros{advancedCount > 0 && <span className="rounded bg-primary/15 px-1.5 text-xs text-primary">{advancedCount}</span>}</Button>
      </div>
      <div id="ticket-advanced-filters" hidden={!advancedOpen}>
        <div className={`grid gap-4 border-t border-border bg-muted/20 p-4 sm:grid-cols-2 ${assignedToMe ? '' : 'lg:grid-cols-3'}`}>
          <label htmlFor="ticket-department" className="text-xs text-muted-foreground">Departamento<SelectInput id="ticket-department" value={filters.departmentId} onValueChange={value => set('departmentId', value)}><SelectOption value="">Todos los autorizados</SelectOption>{options.data?.departments.map(department => <SelectOption key={department.id} value={department.id}>{department.name}{!department.isActive && ' (inactivo)'}</SelectOption>)}</SelectInput></label>
          <label htmlFor="ticket-filter-category" className="text-xs text-muted-foreground">Categoría<SelectInput id="ticket-filter-category" value={filters.categoryId} onValueChange={value => set('categoryId', value)}><SelectOption value="">Todas las categorías</SelectOption>{options.data?.categories.filter(category => !filters.departmentId || category.departmentId === filters.departmentId).map(category => <SelectOption key={category.id} value={category.id}>{category.name}{!category.isActive && ' (inactiva)'}</SelectOption>)}</SelectInput></label>
          {!assignedToMe && <label htmlFor="ticket-assignee" className="text-xs text-muted-foreground">Responsable<SelectInput id="ticket-assignee" value={filters.assignedToId} onValueChange={value => set('assignedToId', value)}><SelectOption value="">Todos los responsables</SelectOption><SelectOption value="unassigned">Sin asignar</SelectOption>{members.map(member => <SelectOption key={member.id} value={member.id}>{member.displayName}{!member.isActive && ' (inactivo)'}</SelectOption>)}</SelectInput></label>}
        </div>
      </div>
      {chips.length > 0 && <div aria-label="Filtros activos" className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">{chips.map(chip => <button key={chip.key} type="button" aria-label={`Quitar filtro ${chip.label}`} onClick={() => set(chip.key, '')} className="inline-flex max-w-full items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs text-primary transition-colors hover:bg-primary/15"><span className="truncate">{chip.label}</span><X className="size-3 shrink-0" aria-hidden="true"/></button>)}<Button type="button" variant="ghost" size="sm" onClick={clear} className="text-xs text-muted-foreground">Limpiar filtros</Button></div>}
    </div>
    <Notice error={options.error}/>

    <div className="overflow-hidden rounded-xl border border-border bg-card" aria-busy={query.isFetching}>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-medium">Solicitudes<span className="rounded-md bg-secondary px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{query.data?.meta.total ?? '—'}</span></h2><span role="status" className="flex items-center gap-2 text-xs text-muted-foreground">{query.isFetching ? <><LoaderCircle className="size-3.5 animate-spin" aria-hidden="true"/>Actualizando…</> : chips.length ? 'Resultados filtrados' : assignedToMe ? 'Asignadas a ti' : 'Alcance autorizado'}</span></div>
      {rows.length > 0 && <div className="overflow-x-auto" role="region" aria-label="Listado de tickets" tabIndex={0}><table className="w-full min-w-[1050px] text-left text-sm [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:px-4 [&_td]:py-4"><thead className="bg-muted/30"><tr><th>Solicitud</th><th>Solicitante</th><th>Equipo / categoría</th><th>Estado</th><th>Prioridad</th><th>Responsable</th><th>Actualizada</th></tr></thead><tbody className="divide-y divide-border">{rows.map(ticket => <tr key={ticket.id} className="transition-colors hover:bg-accent/25"><td className="max-w-80 min-w-64"><Link to={`${area}/tickets/${ticket.id}`} className="group block rounded-sm"><span className="mb-1 block font-mono text-[11px] text-muted-foreground">{ticket.publicNumber}</span><span className="flex items-start gap-2 font-medium leading-5 group-hover:text-primary"><span className="line-clamp-2">{ticket.title}</span><ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true"/></span></Link></td><td><span className="flex items-center gap-2.5"><span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[11px] text-muted-foreground">{ticket.requester.displayName.slice(0, 1).toLocaleUpperCase()}</span><span className="max-w-36 truncate text-xs">{ticket.requester.displayName}</span></span></td><td><p className="text-xs font-medium">{ticket.department.name}</p><p className="mt-1 text-xs text-muted-foreground">{ticket.category.name}</p></td><td><TicketStatusBadge status={ticket.status}/></td><td><span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${priorityColors[ticket.priority]}`}>{ticket.priority === 'LOW' ? <ArrowDown className="size-3.5" aria-hidden="true"/> : ticket.priority === 'NORMAL' ? <Circle className="size-3" aria-hidden="true"/> : <Flag className="size-3.5" aria-hidden="true"/>}{priorityLabels[ticket.priority]}</span></td><td><span className={`flex items-center gap-2 text-xs ${ticket.assignee ? '' : 'text-muted-foreground'}`}><UserRound className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true"/>{ticket.assignee?.displayName ?? 'Sin asignar'}</span></td><td className="whitespace-nowrap text-xs text-muted-foreground">{dateTime(ticket.updatedAt)}</td></tr>)}</tbody></table></div>}
      <ListState pending={query.isPending} error={query.error} empty={!rows.length} retry={() => void query.refetch()}/>
      {!query.isPending && !query.error && !rows.length && chips.length > 0 && <div className="-mt-6 flex justify-center pb-6"><Button type="button" variant="outline" size="sm" onClick={clear}>Limpiar filtros</Button></div>}
      <Pager meta={query.data?.meta} onPage={setPage}/>
    </div>
    {assignedToMe && <p className="text-xs leading-5 text-muted-foreground">¿Buscas los tickets que creaste? Están en <Link to="/app/tickets" className="text-primary hover:underline">Mis solicitudes</Link>.</p>}
  </section>;
}
