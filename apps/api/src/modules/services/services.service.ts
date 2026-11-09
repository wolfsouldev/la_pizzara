import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, type ServiceCreate, type ServicePatch, type ServiceNoteCreate, type ServiceList, type AdminServiceList } from '@uni/shared';
import type { User } from '../../database/schema';
import { ServicesRepository } from '../../database/repositories/services.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { TicketAccessPolicy } from '../../common/policies/ticket-access.policy';
import { PaginatedResult } from '../../common/pagination';
@Injectable()
export class ServicesService {
  constructor(private readonly services: ServicesRepository, private readonly audit: AuditRepository, private readonly unit: DatabaseUnitOfWork, private readonly tickets: TicketAccessPolicy) {}
  private admin(user: User) { if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Solo administración puede gestionar los servicios y ver sus notas internas'); }
  get(id: string, admin = false) { const row = this.services.get(id); if (!row || (!admin && !row.isActive)) throw new NotFoundException('Servicio no encontrado'); return row; }
  requireActive(id: string) { const row = this.services.get(id); if (!row || !row.isActive) throw new ConflictException('El servicio no está disponible en el catálogo'); return row; }
  list(q: ServiceList) { return new PaginatedResult(this.services.list(q, false), q); }
  adminList(user: User, q: AdminServiceList) { this.admin(user); return new PaginatedResult(this.services.list(q, true), q); }
  adminGet(user: User, id: string) { this.admin(user); return this.get(id, true); }
  create(user: User, input: ServiceCreate) { this.admin(user); return this.unit.run(() => {
    if (this.services.duplicate(input.name)) throw new ConflictException('Ya existe un servicio con ese nombre');
    const row = this.services.create(input, Date.now()); this.audit.record(user.id, 'SERVICE_CREATED', 'service', row.id, { status: row.status }); return row;
  }); }
  patch(user: User, id: string, input: ServicePatch) { this.admin(user); return this.unit.run(() => {
    const previous = this.get(id, true); if (input.name && this.services.duplicate(input.name, id)) throw new ConflictException('Ya existe un servicio con ese nombre');
    const row = this.services.update(id, input, Date.now(), input.status !== undefined && input.status !== previous.status);
    // Do not copy descriptions or note content into globally readable audit metadata.
    this.audit.record(user.id, 'SERVICE_UPDATED', 'service', id, { fields: Object.keys(input), fromStatus: previous.status, toStatus: row.status, isActive: row.isActive }); return row;
  }); }
  notes(id: string, q: { page: number; limit: number }) { this.get(id); return new PaginatedResult(this.services.notes(id, q, false), q); }
  adminNotes(user: User, id: string, q: { page: number; limit: number }) { this.admin(user); this.get(id, true); return new PaginatedResult(this.services.notes(id, q, true), q); }
  addNote(user: User, id: string, input: ServiceNoteCreate) { this.admin(user); return this.unit.run(() => {
    this.get(id, true); const row = this.services.addNote(id, user.id, input, Date.now()); this.audit.record(user.id, 'SERVICE_NOTE_ADDED', 'service', id, { noteId: row.id, visibility: row.visibility }); return row;
  }); }
  deleteNote(user: User, id: string, noteId: string) { this.admin(user); return this.unit.run(() => {
    this.get(id, true); const note = this.services.deleteNote(id, noteId); if (!note) throw new NotFoundException('Nota no encontrada');
    this.audit.record(user.id, 'SERVICE_NOTE_DELETED', 'service', id, { noteId, visibility: note.visibility }); return { ok: true };
  }); }
  ticket(user: User, id: string, staff: boolean) { const row = staff ? this.tickets.requireStaff(user, id) : this.tickets.requireOwned(user, id); return { service: row.ticket.serviceId ? this.get(row.ticket.serviceId, true) : null, canEdit: staff ? this.tickets.canEdit(user, row.ticket) : row.ticket.status !== 'CLOSED' }; }
  link(user: User, id: string, serviceId: string | null, staff: boolean) { return this.unit.run(() => {
    const { ticket } = staff ? this.tickets.requireStaff(user, id) : this.tickets.requireOwned(user, id);
    if (staff) this.tickets.assertEdit(user, ticket); else this.tickets.assertWritable(ticket);
    // Existing archived links stay readable, but cannot be newly assigned.
    if (serviceId && serviceId !== ticket.serviceId) this.requireActive(serviceId);
    if (serviceId !== ticket.serviceId) { this.services.link(id, serviceId, Date.now()); this.audit.record(user.id, 'TICKET_SERVICE_CHANGED', 'ticket', id, { fromServiceId: ticket.serviceId, toServiceId: serviceId }); }
    return this.ticket(user, id, staff);
  }); }
}
