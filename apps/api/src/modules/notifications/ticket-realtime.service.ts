import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { TicketsRepository } from '../../database/repositories/tickets.repository';
import { StaffTicketsRepository } from '../../database/repositories/staff-tickets.repository';
import type { User } from '../../database/schema';

type Change = { ticketId: string; publicChange: boolean };

@Injectable()
export class TicketRealtimeService implements OnModuleDestroy {
  private listeners = new Set<(change: Change) => void>();
  private pending: { ticketId: string; eventId: string; publicChange: boolean }[] = [];
  private scheduled = false;
  constructor(private readonly tickets: TicketsRepository, private readonly staff: StaffTicketsRepository) {}

  subscribe(listener: (change: Change) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  canReceive(user: User, { ticketId, publicChange }: Change) {
    if (publicChange && this.tickets.owned(ticketId, user.id)) return true;
    return (user.role === 'ADMIN' || user.role === 'TECHNICIAN') && !!this.staff.get(user, ticketId);
  }
  afterEvent(ticketId: string, eventId: string, publicChange: boolean) {
    this.pending.push({ ticketId, eventId, publicChange });
    if (this.scheduled) return;
    this.scheduled = true;
    // The complete synchronous SQLite transaction (including outer savepoints)
    // finishes before this microtask. An event rolled back must not send a wake.
    queueMicrotask(() => {
      const pending = this.pending; this.pending = []; this.scheduled = false;
      const changes = new Map<string, Change>();
      for (const item of pending) if (this.tickets.eventPersisted(item.ticketId, item.eventId)) {
        const previous = changes.get(item.ticketId);
        changes.set(item.ticketId, { ticketId: item.ticketId, publicChange: item.publicChange || !!previous?.publicChange });
      }
      for (const change of changes.values()) for (const listener of this.listeners) listener(change);
    });
  }
  onModuleDestroy() { this.listeners.clear(); this.pending = []; }
}
