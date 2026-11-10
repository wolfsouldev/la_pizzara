import { NotificationRealtimeService } from './notification-realtime.service';
import { PaginatedResult } from '../../common/pagination';
import type { NotificationList } from '@uni/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ticketNumber, type TicketStatus } from '@uni/shared';
import { NotificationsRepository } from '../../database/repositories/notifications.repository';
import type { Ticket, TaskRow, User } from '../../database/schema';
@Injectable()
export class NotificationsService {
  constructor(private readonly notifications: NotificationsRepository, private readonly realtime: NotificationRealtimeService) {}
  private create(input: Parameters<NotificationsRepository['create']>[0]) { const row=this.notifications.create(input);this.realtime.afterInsert(row.id,row.userId); }
  private dto(user:User,row:NonNullable<ReturnType<NotificationsRepository['get']>>) {
    const {boardId,...data}=row;const area=user.role==='SUPER_ADMIN'||user.role==='ADMIN'?'admin':'staff';
    const publicTicket=['TICKET_PUBLIC_REPLY','TICKET_STATUS_CHANGED'].includes(row.type);
    return {...data,href:row.resourceType==='task'&&boardId?`/${area}/boards/${boardId}?taskId=${row.resourceId}`:row.resourceType==='ticket'?`/${publicTicket?'app':area}/tickets/${row.resourceId}`:null};
  }
  list(user:User,q:NotificationList) { const result=this.notifications.list(user,q);return new PaginatedResult({rows:result.rows.map(row=>this.dto(user,row)),total:result.total},q); }
  unread(user:User) { return {count:this.notifications.unread(user)}; }
  read(user:User,id:string) { if(!this.notifications.get(user,id))throw new NotFoundException('Notificación no encontrada');this.notifications.read(user,id);const row=this.notifications.get(user,id)!;this.realtime.changed(user.id);return this.dto(user,row); }
  readAll(user:User) { const updated=this.notifications.readAll(user);if(updated)this.realtime.changed(user.id);return {updated}; }
  private send(ticket: Ticket, userId: string, actorId: string, type: string, title: string, message: string, now: number) {
    if (userId !== actorId) this.create({ userId, type, title: `${title} ${ticketNumber(ticket.ticketNumber)}`, message, resourceType: 'ticket', resourceId: ticket.id, createdAt: now });
  }
  ticketAssigned(ticket: Ticket, userId: string, actorId: string, now: number) { this.send(ticket, userId, actorId, 'TICKET_ASSIGNED', 'Solicitud asignada', ticket.title, now); }
  ticketPublicReply(ticket: Ticket, actorId: string, now: number) { this.send(ticket, ticket.requesterId, actorId, 'TICKET_PUBLIC_REPLY', 'Nueva respuesta en', 'Hay una nueva respuesta pública en tu solicitud.', now); }
  ticketStatusChanged(ticket: Ticket, actorId: string, status: TicketStatus, now: number) {
    const labels: Record<TicketStatus, string> = { OPEN: 'Abierta', ASSIGNED: 'Asignada', IN_PROGRESS: 'En progreso', WAITING_USER: 'Esperando tu respuesta', RESOLVED: 'Resuelta', CLOSED: 'Cerrada' };
    this.send(ticket, ticket.requesterId, actorId, 'TICKET_STATUS_CHANGED', 'Estado actualizado en', `Estado: ${labels[status]}`, now);
  }
  taskAssigned(task: TaskRow, userId: string, actorId: string, now: number) { if (userId !== actorId) this.create({ userId, type: 'TASK_ASSIGNED', title: 'Nueva tarea asignada', message: task.title, resourceType: 'task', resourceId: task.id, createdAt: now }); }
  ticketCreated(ticket: Ticket, actorId: string, now: number) {
    for (const user of this.notifications.activeAdministratorsExcept(actorId)) this.create({ userId: user.id, type: 'TICKET_CREATED', title: `Nueva solicitud ${ticketNumber(ticket.ticketNumber)}`, message: ticket.title, resourceType: 'ticket', resourceId: ticket.id, createdAt: now });
  }
}
