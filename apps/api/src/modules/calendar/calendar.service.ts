import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CalendarApprove, CalendarEventInput, CalendarRange, CalendarRequestInput, CalendarRequestList } from '@uni/shared';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { CalendarRepository } from '../../database/repositories/calendar.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { PaginatedResult } from '../../common/pagination';
import type { User } from '../../database/schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CalendarService {
  constructor(private readonly repo: CalendarRepository, private readonly unit: DatabaseUnitOfWork,
    private readonly audit: AuditRepository, private readonly notifications: NotificationsService) {}

  publicEvents(range: CalendarRange) { return this.repo.publicEvents(range); }
  adminEvents(range: CalendarRange) { return this.repo.adminEvents(range); }
  private available(start: number, end: number, except?: string) {
    if (this.repo.overlaps(start, end, except)) throw new ConflictException('El horario coincide con otro evento de la agenda.');
  }
  private activeEvent(id: string) {
    const row = this.repo.event(id);
    if (!row) throw new NotFoundException('Evento no encontrado');
    if (row.cancelledAt !== null) throw new ConflictException('El evento ya está cancelado');
    return row;
  }
  private startInFuture(startAt: number) {
    if (startAt <= Date.now()) throw new UnprocessableEntityException('Elige una fecha y hora de inicio futuras');
  }
  createEvent(actor: User, input: CalendarEventInput) {
    return this.unit.run(() => {
      this.available(input.startAt, input.endAt);
      const now = Date.now();
      const event = this.repo.insertEvent({ ...input, id: randomUUID(), type: 'VIDEOCONFERENCE', createdById: actor.id, createdAt: now, updatedAt: now });
      this.audit.record(actor.id, 'CALENDAR_EVENT_CREATED', 'calendar_event', event.id, { visibility: event.visibility });
      return event;
    });
  }
  updateEvent(actor: User, id: string, input: CalendarEventInput) {
    return this.unit.run(() => {
      const current = this.activeEvent(id);
      if (current.requestId && input.visibility !== 'PUBLIC') throw new ConflictException('Los eventos de reservas aprobadas permanecen públicos; cancélalo para retirarlo.');
      this.available(input.startAt, input.endAt, id);
      const updated = this.repo.updateEvent(id, { ...input, updatedAt: Date.now() });
      this.audit.record(actor.id, 'CALENDAR_EVENT_UPDATED', 'calendar_event', id, { visibility: updated.visibility });
      return updated;
    });
  }
  cancelEvent(actor: User, id: string) {
    this.unit.run(() => {
      const event = this.activeEvent(id);
      const now = Date.now();
      this.repo.updateEvent(id, { cancelledAt: now, updatedAt: now });
      this.audit.record(actor.id, 'CALENDAR_EVENT_CANCELLED', 'calendar_event', id);
      if (event.requestId) {
        const request = this.repo.request(event.requestId)!;
        this.notifications.calendarReservation(request.requesterId, request.id, 'CANCELLED', now);
      }
    });
  }
  ownRequests(actor: User, query: CalendarRequestList) { return new PaginatedResult(this.repo.ownRequests(actor.id, query), query); }
  reviewRequests(query: CalendarRequestList) { return new PaginatedResult(this.repo.reviewRequests(query), query); }
  submit(actor: User, input: CalendarRequestInput) {
    return this.unit.run(() => {
      this.startInFuture(input.startAt);
      const id = randomUUID();
      this.repo.insertRequest({ ...input, id, requesterId: actor.id, createdAt: Date.now() });
      this.audit.record(actor.id, 'CALENDAR_REQUEST_CREATED', 'calendar_request', id);
      return this.repo.ownRequest(id, actor.id)!;
    });
  }
  private pendingRequest(id: string, owner?: string) {
    const request = this.repo.request(id, owner);
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== 'PENDING') throw new ConflictException('La solicitud ya no está pendiente');
    return request;
  }
  withdraw(actor: User, id: string) {
    this.unit.run(() => {
      this.pendingRequest(id, actor.id);
      this.repo.decide(id, { status: 'WITHDRAWN', decidedAt: Date.now(), decidedById: actor.id });
      this.audit.record(actor.id, 'CALENDAR_REQUEST_WITHDRAWN', 'calendar_request', id);
    });
  }
  approve(actor: User, id: string, input: CalendarApprove) {
    return this.unit.run(() => {
      const request = this.pendingRequest(id);
      if (request.startAt <= Date.now()) throw new ConflictException('La hora solicitada ya pasó');
      this.available(request.startAt, request.endAt);
      const now = Date.now();
      const event = this.repo.insertEvent({ id: randomUUID(), type: 'VIDEOCONFERENCE', title: input.publicTitle, publicDescription: input.publicDescription,
        startAt: request.startAt, endAt: request.endAt, visibility: 'PUBLIC', requestId: id, createdById: actor.id, createdAt: now, updatedAt: now });
      this.repo.decide(id, { status: 'APPROVED', decidedAt: now, decidedById: actor.id, decisionNote: input.note });
      this.audit.record(actor.id, 'CALENDAR_REQUEST_APPROVED', 'calendar_request', id, { eventId: event.id });
      this.notifications.calendarReservation(request.requesterId, id, 'APPROVED', now);
      return this.repo.review(id)!;
    });
  }
  reject(actor: User, id: string, note: string) {
    return this.unit.run(() => {
      const request = this.pendingRequest(id);
      const now = Date.now();
      this.repo.decide(id, { status: 'REJECTED', decidedAt: now, decidedById: actor.id, decisionNote: note });
      this.audit.record(actor.id, 'CALENDAR_REQUEST_REJECTED', 'calendar_request', id);
      this.notifications.calendarReservation(request.requesterId, id, 'REJECTED', now);
      return this.repo.review(id)!;
    });
  }
}
