import { CircleCheck, CircleHelp, CircleAlert, CircleX, Wrench } from 'lucide-react';
import { serviceStatusLabels, type ServiceStatus } from '@uni/shared';

const styles = {
  OPERATIONAL: 'border-success/25 bg-success/10 text-success',
  DEGRADED: 'border-warning/30 bg-warning/10 text-warning',
  OUTAGE: 'border-destructive/30 bg-destructive/10 text-destructive',
  MAINTENANCE: 'border-primary/30 bg-primary/10 text-primary',
  UNKNOWN: 'border-border bg-secondary/60 text-muted-foreground',
};
const icons = { OPERATIONAL: CircleCheck, DEGRADED: CircleAlert, OUTAGE: CircleX, MAINTENANCE: Wrench, UNKNOWN: CircleHelp };

export function ServiceStatusBadge({ status, prominent = false }: { status: ServiceStatus; prominent?: boolean }) {
  const Icon = icons[status];
  return <span className={`inline-flex max-w-full items-center border ${prominent ? 'w-full gap-3 rounded-xl px-3.5 py-3' : 'gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium'} ${styles[status]}`}>
    <Icon className={prominent ? 'size-6 shrink-0' : 'size-3.5 shrink-0'} aria-hidden="true"/>
    {prominent ? <span className="min-w-0"><span className="block text-[15px] font-semibold leading-5">{serviceStatusLabels[status]}</span><span className="mt-0.5 block text-xs opacity-85">{status === 'UNKNOWN' ? 'Pendiente de confirmación' : 'Estado informado por administración'}</span></span> : serviceStatusLabels[status]}
  </span>;
}
