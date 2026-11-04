import { useState } from 'react';
import { Link } from 'react-router';
import { ticketStatuses } from '@uni/shared';
import { Plus, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Heading, ListState, Pager, tableClass } from '@/components/common/data-view';
import { dateTime, statusLabels, useMyTickets } from './tickets';
import { TicketStatusBadge } from './TicketStatusBadge';
export function MyTicketsPage() {
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const query = useMyTickets({ page, search, status });
  return <section><Heading title="Mis solicitudes" description="Toda la ayuda que has solicitado, con sus respuestas y avances."><Button asChild><Link to="/app/tickets/new"><Plus size={16}/>Nueva solicitud</Link></Button></Heading><div className="my-6 grid gap-4 sm:grid-cols-2"><label>Buscar solicitud<input type="search" maxLength={200} placeholder="Número, título o descripción…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></label><label>Estado<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Todos los estados</option>{ticketStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label></div>
    <div className="overflow-hidden rounded-xl border border-border bg-card"><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Número / solicitud</th><th>Departamento / categoría</th><th>Estado</th><th>Creada</th><th>Actualizada</th></tr></thead><tbody>{query.data?.data.map(t => <tr key={t.id}><td className="min-w-56"><Link to={`/app/tickets/${t.id}`} className="font-medium text-primary hover:underline"><span className="block font-mono text-xs text-muted-foreground">{t.publicNumber}</span>{t.title}</Link></td><td className="min-w-40">{t.department.name}<span className="block text-xs text-muted-foreground">{t.category.name}</span></td><td><TicketStatusBadge status={t.status}/></td><td className="whitespace-nowrap text-xs text-muted-foreground">{dateTime(t.createdAt)}</td><td className="whitespace-nowrap text-xs text-muted-foreground">{dateTime(t.updatedAt)}</td></tr>)}</tbody></table></div>
      {!query.isPending && !query.error && !query.data?.data.length ? <div className="flex flex-col items-center gap-3 px-6 py-12 text-center"><Ticket size={32} className="text-muted-foreground"/><h2 className="font-medium">{search || status ? 'No hay solicitudes con estos filtros' : 'Todavía no has creado solicitudes'}</h2><p className="max-w-md text-sm text-muted-foreground">{search || status ? 'Prueba con otra búsqueda o cambia el estado.' : 'Cuando necesites ayuda, crea una solicitud y consulta su seguimiento aquí.'}</p><Button variant="outline" asChild><Link to="/app/tickets/new">Crear solicitud</Link></Button></div> : <ListState pending={query.isPending} error={query.error} empty={false} retry={() => void query.refetch()}/>}
      <Pager meta={query.data?.meta} onPage={setPage}/></div>
  </section>;
}
