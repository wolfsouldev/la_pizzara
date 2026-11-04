import { Link } from 'react-router';
import { Ticket, CircleDot, UserRound, ListTodo, ArrowUpRight, Inbox, type LucideIcon } from 'lucide-react';
import { Heading, ListState, tableClass } from '@/components/common/data-view';
import { Button } from '@/components/ui/button';
import { priorityLabels } from '@/features/tickets/tickets';
import { useStaffArea, useTicketDashboard } from './staff';
import { useSession } from '@/features/auth/auth';

function Metric({ label, value, icon: Icon, hint }: { label: string; value: number; icon: LucideIcon; hint: string }) {
  return <article className="surface p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className="size-[18px] text-muted-foreground" aria-hidden="true"/></div><p className="mt-5 text-4xl font-semibold tracking-tight tabular-nums">{value.toLocaleString('es')}</p><p className="mt-2 text-xs text-muted-foreground">{hint}</p></article>;
}

export function TicketDashboardPage() {
  const area = useStaffArea();
  const query = useTicketDashboard(area);
  const session = useSession();
  const d = query.data;
  if (!d) return <ListState pending={query.isPending} error={query.error} empty={false} retry={() => void query.refetch()}/>;
  const statuses = [
    ['Abiertas', d.openTickets, 'bg-primary'], ['Asignadas', d.assignedTickets, 'bg-primary'],
    ['En progreso', d.inProgressTickets, 'bg-warning'], ['Esperando usuario', d.waitingUserTickets, 'bg-warning'],
    ['Resueltas', d.resolvedTickets, 'bg-success'], ['Cerradas', d.closedTickets, 'bg-muted-foreground'],
  ] as const;
  return <section>
    <Heading title={`Hola, ${session.data?.displayName.split(' ')[0] ?? 'equipo'}`} description={area === '/admin' ? 'Una vista general del trabajo y la atención en la universidad.' : 'El trabajo de tus departamentos, con tus tickets y tareas pendientes.'}>
      <Button asChild variant="outline"><Link to={`${area}/tickets`}>Abrir bandeja<ArrowUpRight aria-hidden="true"/></Link></Button>
    </Heading>
    <ListState pending={query.isPending} error={query.error} empty={false} retry={() => void query.refetch()}/>
    <div className="my-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Tickets registrados" value={d.totalTickets} icon={Ticket} hint="Dentro de tu alcance de atención"/>
      <Metric label="Por asignar" value={d.unassignedTickets} icon={CircleDot} hint="Solicitudes pendientes sin responsable"/>
      <Metric label="Mis tickets" value={d.myAssignedTickets} icon={UserRound} hint="Asignados a ti y pendientes"/>
      <Metric label="Mis tareas" value={d.myPendingTasks} icon={ListTodo} hint="En tableros autorizados, por completar"/>
    </div>
    <article className="surface mb-7 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Estado de las solicitudes</h2><span className="text-xs text-muted-foreground">Distribución actual</span></div><div className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-3 xl:grid-cols-6">{statuses.map(([label, value, color]) => <div key={label}><p className="flex items-center gap-2 text-xs text-muted-foreground"><span className={`size-1.5 shrink-0 rounded-full ${color}`} aria-hidden="true"/>{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString('es')}</p></div>)}</div></article>
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <article className="surface min-w-0 overflow-hidden"><div className="flex items-center justify-between border-b border-border p-5"><h2 className="text-sm font-semibold">Por departamento</h2><span className="text-xs text-muted-foreground">Tickets</span></div><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Departamento</th><th className="text-right">Total</th></tr></thead><tbody>{d.ticketsByDepartment.map(row => <tr key={row.departmentId}><td>{row.name}</td><td className="text-right font-medium">{row.count.toLocaleString('es')}</td></tr>)}</tbody></table></div>{!d.ticketsByDepartment.length && <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><Inbox size={18} aria-hidden="true"/>Todavía no hay tickets en tu alcance.</div>}</article>
      <article className="surface min-w-0 overflow-hidden"><div className="border-b border-border p-5"><h2 className="text-sm font-semibold">Por prioridad</h2></div><table className={tableClass}><thead><tr><th>Prioridad</th><th className="text-right">Total</th></tr></thead><tbody>{d.ticketsByPriority.map(row => <tr key={row.priority}><td><span className={`inline-flex items-center gap-2 ${row.priority === 'URGENT' ? 'text-destructive' : row.priority === 'HIGH' ? 'text-warning' : 'text-foreground'}`}><span className="size-1.5 rounded-full bg-current" aria-hidden="true"/>{priorityLabels[row.priority]}</span></td><td className="text-right font-medium">{row.count.toLocaleString('es')}</td></tr>)}</tbody></table>{!d.ticketsByPriority.length && <p className="p-6 text-sm text-muted-foreground">Sin tickets registrados.</p>}</article>
    </div>
    <p className="mt-5 text-xs text-muted-foreground">Se actualiza cada 30 segundos. Solo se incluyen los datos que tu cuenta puede consultar.</p>
  </section>;
}
