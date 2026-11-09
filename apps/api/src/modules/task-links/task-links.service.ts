import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ticketNumber, type KanbanPage, type TaskFromTicketCreate } from '@uni/shared';
import type { User } from '../../database/schema';
import { TaskLinksRepository } from '../../database/repositories/task-links.repository';
import { TasksRepository } from '../../database/repositories/tasks.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { TaskAccessPolicy } from '../../common/policies/task-access.policy';
import { BoardAccessPolicy } from '../../common/policies/board-access.policy';
import { TicketAccessPolicy } from '../../common/policies/ticket-access.policy';
import { TasksService } from '../tasks/tasks.service';
import { PaginatedResult } from '../../common/pagination';
@Injectable()
export class TaskLinksService {
  constructor(private readonly links: TaskLinksRepository, private readonly tasks: TasksRepository, private readonly audit: AuditRepository, private readonly unit: DatabaseUnitOfWork, private readonly taskPolicy: TaskAccessPolicy, private readonly boardPolicy: BoardAccessPolicy, private readonly ticketPolicy: TicketAccessPolicy, private readonly taskService: TasksService) {}
  tickets(user: User, taskId: string, q: KanbanPage) {
    const { board } = this.taskPolicy.require(user, taskId);
    const result = this.links.tickets(user, taskId, q);
    return new PaginatedResult({ total: result.total, rows: result.rows.map(({ ticketId, ticketNumber: number, title, status, priority, createdById, createdAt, assignedToId }) => ({ ticketId, publicNumber: ticketNumber(number), title, status, priority, createdById, createdAt, canUnlink: board.permission !== 'VIEW' && status !== 'CLOSED' && (user.role === 'SUPER_ADMIN' || assignedToId === user.id) })) }, q);
  }
  tasksForTicket(user: User, ticketId: string, q: KanbanPage) {
    const { ticket } = this.ticketPolicy.requireStaff(user, ticketId); const result = this.links.tasks(user, ticketId, q);
    return new PaginatedResult({ total: result.total, rows: result.rows.map(({ permission, ...row }) => ({ ...row, canUnlink: this.ticketPolicy.canEdit(user, ticket) && (user.role === 'SUPER_ADMIN' || permission === 'EDIT' || permission === 'MANAGE') })) }, q);
  }
  private record(user: User, taskId: string, ticketId: string, action: 'TICKET_LINKED' | 'TICKET_UNLINKED', now: number) {
    this.tasks.update(user, taskId, {}, now); this.tasks.event(taskId, user.id, 'UPDATED', now, { action, ticketId });
    // Do not put task IDs or titles into public ticket events or notifications.
    this.audit.record(user.id, action, 'task', taskId, { ticketId });
  }
  link(user: User, taskId: string, ticketId: string) {
    return this.unit.run(() => {
      const { board } = this.taskPolicy.require(user, taskId, true); const { ticket } = this.ticketPolicy.requireStaff(user, ticketId); this.ticketPolicy.assertEdit(user, ticket);
      if (ticket.departmentId !== board.board.departmentId) throw new ConflictException('La tarea y el ticket deben pertenecer al mismo departamento');
      if (this.links.get(taskId, ticketId)) throw new ConflictException('El ticket ya está vinculado a esta tarea');
      const now = Date.now(); const link = this.links.add(taskId, ticketId, user.id, now); this.record(user, taskId, ticketId, 'TICKET_LINKED', now);
      return { ticketId, publicNumber: ticketNumber(ticket.ticketNumber), title: ticket.title, status: ticket.status, priority: ticket.priority, createdById: link.createdById, createdAt: now, canUnlink: true };
    });
  }
  unlink(user: User, taskId: string, ticketId: string) {
    this.unit.run(() => {
      const { task } = this.taskPolicy.require(user, taskId); this.boardPolicy.require(user, task.boardId, 'EDIT', true);
      const { ticket } = this.ticketPolicy.requireStaff(user, ticketId); this.ticketPolicy.assertEdit(user, ticket);
      if (!this.links.get(taskId, ticketId)) throw new NotFoundException('Vínculo no encontrado');
      this.links.remove(taskId, ticketId); this.record(user, taskId, ticketId, 'TICKET_UNLINKED', Date.now());
    });
  }
  createFromTicket(user: User, ticketId: string, body: TaskFromTicketCreate) {
    return this.unit.run(() => {
      const { ticket } = this.ticketPolicy.requireStaff(user, ticketId); this.ticketPolicy.assertEdit(user, ticket);
      const { board } = this.boardPolicy.require(user, body.boardId, 'EDIT'); if (board.departmentId !== ticket.departmentId) throw new ConflictException('Selecciona un tablero del mismo departamento');
      const task = this.taskService.create(user, body.boardId, body); this.link(user, task.id, ticketId); return this.taskService.detail(user, task.id);
    });
  }
}
