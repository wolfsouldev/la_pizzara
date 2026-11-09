import { Archive, ArrowUpRight, ExternalLink, Clock3, MessageSquare, Pencil } from 'lucide-react';
import type { UniversityService } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { dateTime } from '@/features/tickets/tickets';
import { ServiceStatusBadge } from './ServiceStatus';

export function ServiceCard({ service, admin, archivePending, onOpen, onEdit, onArchive }: {
  service: UniversityService;
  admin: boolean;
  archivePending: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return <article className="group flex min-w-0 flex-col rounded-2xl border border-border bg-card transition-colors hover:border-primary/35">
    <div className="flex flex-1 flex-col p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-xs font-semibold tracking-wide text-primary" aria-hidden="true">{service.name.slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 self-center"><h2 className="break-words text-lg font-semibold leading-6 tracking-tight"><button type="button" className="rounded-sm text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onOpen}>{service.name}</button></h2>{!service.isActive && <p className="mt-1 text-xs text-warning">Archivado · no publicado</p>}</div>
      </div>
      <ServiceStatusBadge status={service.status} prominent/>
      <p className="mt-4 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">{service.description}</p>
      <div className={`mt-4 flex items-start gap-2 ${service.latestNote ? 'rounded-lg bg-muted/40 p-3' : ''}`}>
        <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true"/>
        <p className="line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{service.latestNote ?? 'Sin notas públicas por ahora'}</p>
      </div>
      <p className="mt-auto flex items-start gap-1.5 pt-4 text-xs leading-5 text-muted-foreground"><Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true"/><span>Estado desde {dateTime(service.statusUpdatedAt)}</span></p>
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-1">{service.url && <Button asChild variant="secondary" size="sm" className="min-h-10"><a href={service.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`Acceder a ${service.name} (nueva pestaña)`}><ExternalLink size={14} aria-hidden="true"/>Acceder</a></Button>}
      <Button variant="ghost" size="sm" className="min-h-10 text-primary" onClick={onOpen}>Ver información<ArrowUpRight size={14} aria-hidden="true"/></Button></div>
      {admin && <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Editar ${service.name}`} onClick={onEdit}><Pencil size={15} aria-hidden="true"/></Button><Button size="icon" variant="ghost" aria-label={`${service.isActive ? 'Archivar' : 'Restaurar'} ${service.name}`} disabled={archivePending} onClick={onArchive}><Archive size={15} aria-hidden="true"/></Button></div>}
    </footer>
  </article>;
}
