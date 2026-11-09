import { ConflictException, Injectable } from '@nestjs/common';
import { ticketNumber, ticketStatuses, type StaffTicketList, type StaffTicketDetail, type TicketCommentsQuery, type TicketDepartmentChange, type StaffCommentCreate, type TicketStatus } from '@uni/shared';
import { StaffTicketsRepository } from '../../database/repositories/staff-tickets.repository';
import { TicketsRepository } from '../../database/repositories/tickets.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { TicketAccessPolicy } from '../../common/policies/ticket-access.policy';
import { PaginatedResult } from '../../common/pagination';
import { TicketRealtimeService } from '../notifications/ticket-realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { User, Ticket } from '../../database/schema';
const transitions: Record<TicketStatus, readonly TicketStatus[]> = { OPEN: ['ASSIGNED', 'IN_PROGRESS'], ASSIGNED: ['IN_PROGRESS'], IN_PROGRESS: ['WAITING_USER', 'RESOLVED'], WAITING_USER: ['IN_PROGRESS', 'RESOLVED'], RESOLVED: ['CLOSED', 'OPEN'], CLOSED: [] };
@Injectable()
export class StaffTicketsService {
  constructor(private readonly staff: StaffTicketsRepository, private readonly tickets: TicketsRepository, private readonly audit: AuditRepository, private readonly unit: DatabaseUnitOfWork, private readonly policy: TicketAccessPolicy, private readonly notifications: NotificationsService, private readonly realtime: TicketRealtimeService) {}
  list(user: User, q: StaffTicketList) { this.policy.assertStaff(user); return new PaginatedResult(this.staff.list(user, q), q); }
  options(user: User) { this.policy.assertStaff(user); return this.staff.options(user); }
  private allowed(user: User, t: Ticket): TicketStatus[] {
    if (!this.policy.canEdit(user, t)) return [];
    return ticketStatuses.filter(s => s !== t.status && (transitions[t.status].includes(s) || (user.role === 'SUPER_ADMIN' && s === 'RESOLVED' && t.status !== 'RESOLVED')) && (s !== 'ASSIGNED' || !!t.assignedToId));
  }
  detail(user: User, id: string): StaffTicketDetail {
    const { ticket: t, department, category, requester, assignee } = this.policy.requireStaff(user, id);
    return { id: t.id, ticketNumber: t.ticketNumber, publicNumber: ticketNumber(t.ticketNumber), title: t.title, description: t.description, department, category, requester, assignee, priority: t.priority, status: t.status, assignedAt: t.assignedAt, resolvedAt: t.resolvedAt, closedAt: t.closedAt, createdAt: t.createdAt, updatedAt: t.updatedAt, canEdit: this.policy.canEdit(user, t), canAssign: user.role === 'SUPER_ADMIN' && t.status !== 'CLOSED', allowedStatuses: this.allowed(user, t) };
  }
  comments(user: User, id: string, q: TicketCommentsQuery) { this.policy.requireStaff(user, id); return new PaginatedResult(this.staff.comments(user, id, q), q); }
  events(user: User, id: string, q: TicketCommentsQuery) { this.policy.requireStaff(user, id); return new PaginatedResult(this.staff.events(user, id, q), q); }
  private record(user: User, id: string, event: Parameters<TicketsRepository['event']>[2], action: string, now: number, metadata: Record<string, unknown>, publicChange = true) {
    const eventId = this.tickets.event(id, user.id, event, now, metadata); this.audit.record(user.id, action, 'ticket', id, metadata);
    this.realtime.afterEvent(id, eventId, publicChange);
  }
  status(user: User, id: string, status: TicketStatus) {
    return this.unit.run(() => {
      const { ticket: t } = this.policy.requireStaff(user, id); this.policy.assertEdit(user, t);
      if (!this.allowed(user, t).includes(status)) throw new ConflictException('Transición de estado no permitida');
      const now = Date.now();
      this.staff.update(user, id, { status, ...(status === 'RESOLVED' ? { resolvedAt: now, closedAt: null } : status === 'CLOSED' ? { closedAt: now } : t.status === 'RESOLVED' ? { resolvedAt: null, closedAt: null } : {}) }, now);
      this.record(user, id, status === 'RESOLVED' ? 'RESOLVED' : status === 'CLOSED' ? 'CLOSED' : t.status === 'RESOLVED' ? 'REOPENED' : 'STATUS_CHANGED', 'TICKET_STATUS_CHANGED', now, { fromStatus: t.status, toStatus: status });
      this.notifications.ticketStatusChanged(t, user.id, status, now); return this.detail(user, id);
    });
  }
  priority(user: User, id: string, priority: Ticket['priority']) {
    return this.unit.run(() => {
      const { ticket: t } = this.policy.requireStaff(user, id); this.policy.assertEdit(user, t);
      if (priority === t.priority) throw new ConflictException('El ticket ya tiene esa prioridad');
      const now = Date.now(); this.staff.update(user, id, { priority }, now); this.record(user, id, 'PRIORITY_CHANGED', 'TICKET_PRIORITY_CHANGED', now, { fromPriority: t.priority, toPriority: priority }); return this.detail(user, id);
    });
  }
  private assertAssignee(id: string | null, departmentId: string) { if (id && !this.staff.eligibleAssignee(id, departmentId)) throw new ConflictException('El responsable debe ser un técnico activo del departamento'); }
  assignment(user: User, id: string, assignedToId: string | null) {
    this.policy.assertAdmin(user);
    return this.unit.run(() => {
      const { ticket: t } = this.policy.requireStaff(user, id); this.policy.assertWritable(t); this.assertAssignee(assignedToId, t.departmentId);
      if (t.assignedToId === assignedToId) throw new ConflictException('La asignación no ha cambiado');
      const now = Date.now(); const status = t.status === 'OPEN' && assignedToId ? 'ASSIGNED' : t.status === 'ASSIGNED' && !assignedToId ? 'OPEN' : t.status;
      this.staff.update(user, id, { assignedToId, assignedAt: assignedToId ? now : null, status }, now);
      this.record(user, id, t.assignedToId ? 'REASSIGNED' : 'ASSIGNED', 'TICKET_ASSIGNED', now, { fromAssignedToId: t.assignedToId, toAssignedToId: assignedToId });
      if (status !== t.status) this.tickets.event(id, user.id, 'STATUS_CHANGED', now, { fromStatus: t.status, toStatus: status });
      if (assignedToId) this.notifications.ticketAssigned(t, assignedToId, user.id, now); return this.detail(user, id);
    });
  }
  department(user: User, id: string, input: TicketDepartmentChange) {
    this.policy.assertAdmin(user);
    return this.unit.run(() => {
      const { ticket: t } = this.policy.requireStaff(user, id); this.policy.assertWritable(t);
      if (t.departmentId !== input.departmentId && this.tickets.hasTaskLinks(id)) throw new ConflictException('Retira los vínculos con tareas antes de cambiar de departamento');
      if (!this.staff.category(input.categoryId, input.departmentId)) throw new ConflictException('Selecciona una categoría activa del departamento de destino activo');
      const assignedToId = input.assignedToId ?? null; this.assertAssignee(assignedToId, input.departmentId);
      if (t.departmentId === input.departmentId && t.categoryId === input.categoryId && t.assignedToId === assignedToId) throw new ConflictException('El departamento, la categoría y el responsable no han cambiado');
      const now = Date.now(); const status = t.status === 'ASSIGNED' && !assignedToId ? 'OPEN' : t.status === 'OPEN' && assignedToId ? 'ASSIGNED' : t.status;
      this.staff.update(user, id, { departmentId: input.departmentId, categoryId: input.categoryId, assignedToId, assignedAt: assignedToId ? (t.assignedToId === assignedToId ? t.assignedAt : now) : null, status }, now);
      this.record(user, id, 'REASSIGNED', 'TICKET_DEPARTMENT_CHANGED', now, { fromDepartmentId: t.departmentId, toDepartmentId: input.departmentId, fromCategoryId: t.categoryId, toCategoryId: input.categoryId, fromAssignedToId: t.assignedToId, toAssignedToId: assignedToId });
      if (status !== t.status) this.tickets.event(id, user.id, 'STATUS_CHANGED', now, { fromStatus: t.status, toStatus: status });
      if (assignedToId && assignedToId !== t.assignedToId) this.notifications.ticketAssigned(t, assignedToId, user.id, now); return this.detail(user, id);
    });
  }
  comment(user: User, id: string, input: StaffCommentCreate) {
    return this.unit.run(() => {
      const { ticket: t } = this.policy.requireStaff(user, id); this.policy.assertEdit(user, t); const now = Date.now();
      const c = this.staff.addComment(id, user.id, input.body, input.visibility, now); this.staff.update(user, id, {}, now);
      // No comment bodies in event metadata or audit; internal notes never notify requesters.
      this.record(user, id, 'COMMENT_ADDED', 'TICKET_COMMENT_ADDED', now, { visibility: input.visibility, commentId: c.id }, input.visibility === 'PUBLIC');
      if (input.visibility === 'PUBLIC') this.notifications.ticketPublicReply(t, user.id, now);
      return { id: c.id, body: c.body, visibility: c.visibility, createdAt: c.createdAt, updatedAt: c.updatedAt, author: { id: user.id, displayName: user.displayName } };
    });
  }
  dashboard(user: User, global = false) { if (global) this.policy.assertAdmin(user); else this.policy.assertStaff(user); return this.staff.dashboard(user); }
}
