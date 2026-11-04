import type { TicketStatus } from '@uni/shared';
import { statusLabels } from './tickets';
export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const color = status === 'CLOSED' ? 'bg-secondary text-muted-foreground' : status === 'RESOLVED' ? 'bg-success/10 text-success' : status === 'WAITING_USER' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary';
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{statusLabels[status]}</span>;
}
