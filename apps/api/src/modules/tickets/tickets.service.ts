import { ServicesService } from '../services/services.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { TICKET_REOPEN_WINDOW_MS, publicTicketEventSchema, ticketNumber, ticketStatuses, type TicketCreate, type TicketList, type TicketDetailQuery, type TicketCommentsQuery, type TicketDetail } from '@uni/shared';
import { TicketsRepository } from '../../database/repositories/tickets.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { TicketAccessPolicy } from '../../common/policies/ticket-access.policy';
import { PaginatedResult } from '../../common/pagination';
import { TicketRealtimeService } from '../notifications/ticket-realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { User, Ticket } from '../../database/schema';

@Injectable()
export class TicketsService {
  constructor(private readonly services: ServicesService, private readonly tickets: TicketsRepository, private readonly unit: DatabaseUnitOfWork, private readonly policy: TicketAccessPolicy, private readonly notifications: NotificationsService, private readonly realtime: TicketRealtimeService) {}
  private event(...args: Parameters<TicketsRepository['event']>) { const eventId = this.tickets.event(...args); this.realtime.afterEvent(args[0], eventId, true); }
  list(user: User, q: TicketList) { return new PaginatedResult(this.tickets.listOwned(user.id, q), q); }
  private canReopen(ticket: Ticket, now: number) { return ticket.status === 'RESOLVED' && ticket.resolvedAt !== null && now >= ticket.resolvedAt && now <= ticket.resolvedAt + TICKET_REOPEN_WINDOW_MS; }
  detail(user: User, id: string, q: TicketDetailQuery = { historyPage: 1, historyLimit: 20 }): TicketDetail {
    const { ticket: t, department, category } = this.policy.requireOwned(user, id);
    const historyQuery = { page: q.historyPage, limit: q.historyLimit }; const result = this.tickets.publicHistory(id, user.id, historyQuery);
    // Do not spread event metadata, actors or internal records into a public DTO.
    const rows = result.rows.map(event => {
      const allowedStatus = (value: unknown) => typeof value === 'string' && (ticketStatuses as readonly string[]).includes(value) ? value : undefined;
      return publicTicketEventSchema.parse({ id: event.id, eventType: event.eventType, createdAt: event.createdAt, fromStatus: allowedStatus(event.metadata?.fromStatus), toStatus: allowedStatus(event.metadata?.toStatus) });
    });
    return { id: t.id, ticketNumber: t.ticketNumber, publicNumber: ticketNumber(t.ticketNumber), title: t.title, description: t.description, department, category, status: t.status, priority: t.priority,
      createdAt: t.createdAt, updatedAt: t.updatedAt, resolvedAt: t.resolvedAt, closedAt: t.closedAt, canClose: t.status === 'RESOLVED', canReopen: this.canReopen(t, Date.now()), reopenUntil: t.status === 'RESOLVED' && t.resolvedAt !== null ? t.resolvedAt + TICKET_REOPEN_WINDOW_MS : null, history: new PaginatedResult({ rows, total: result.total }, historyQuery) };
  }
  create(user: User, input: TicketCreate) {
    return this.unit.run(() => {
      if (input.serviceId) this.services.requireActive(input.serviceId);
      const category = this.tickets.activeCategory(input.categoryId); if (!category) throw new ConflictException('La categoría o su departamento ya no están disponibles. Selecciona otra categoría.');
      const now = Date.now(); const t = this.tickets.create(user.id, category.departmentId, input, now);
      this.event(t.id, user.id, 'CREATED', now, { toStatus: 'OPEN' }); this.notifications.ticketCreated(t, user.id, now);
      return this.detail(user, t.id);
    });
  }
  comments(user: User, id: string, q: TicketCommentsQuery) { this.policy.requireOwned(user, id); return new PaginatedResult(this.tickets.publicComments(id, user.id, q), q); }
  comment(user: User, id: string, body: string) {
    return this.unit.run(() => {
      const { ticket } = this.policy.requireOwned(user, id); this.policy.assertWritable(ticket); const now = Date.now();
      const c = this.tickets.addPublicComment(id, user.id, body, now);
      this.event(id, user.id, 'COMMENT_ADDED', now, { visibility: 'PUBLIC' });
      if (ticket.status === 'WAITING_USER') {
        this.tickets.updateOwned(id, user.id, { status: 'IN_PROGRESS' }, now);
        this.event(id, user.id, 'STATUS_CHANGED', now, { fromStatus: 'WAITING_USER', toStatus: 'IN_PROGRESS' });
      } else this.tickets.updateOwned(id, user.id, {}, now);
      return { id: c.id, body: c.body, createdAt: c.createdAt, updatedAt: c.updatedAt, author: { id: user.id, displayName: user.displayName, isRequester: true } };
    });
  }
  close(user: User, id: string) {
    return this.unit.run(() => {
      const { ticket } = this.policy.requireOwned(user, id); if (ticket.status !== 'RESOLVED') throw new ConflictException('Solo puedes cerrar una solicitud resuelta');
      const now = Date.now(); this.tickets.updateOwned(id, user.id, { status: 'CLOSED', closedAt: now }, now); this.event(id, user.id, 'CLOSED', now, { fromStatus: 'RESOLVED', toStatus: 'CLOSED' }); return this.detail(user, id);
    });
  }
  reopen(user: User, id: string) {
    return this.unit.run(() => {
      const { ticket } = this.policy.requireOwned(user, id); const now = Date.now();
      if (!this.canReopen(ticket, now)) throw new ConflictException('Solo puedes reabrir solicitudes resueltas durante los siete días posteriores a la resolución');
      this.tickets.updateOwned(id, user.id, { status: 'OPEN', resolvedAt: null, closedAt: null }, now); this.event(id, user.id, 'REOPENED', now, { fromStatus: 'RESOLVED', toStatus: 'OPEN' }); return this.detail(user, id);
    });
  }
}
