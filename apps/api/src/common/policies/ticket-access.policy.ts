import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@uni/shared';
import { StaffTicketsRepository } from '../../database/repositories/staff-tickets.repository';
import type { User, Ticket } from '../../database/schema';
import { TicketsRepository } from '../../database/repositories/tickets.repository';
@Injectable()
export class TicketAccessPolicy {
  constructor(private readonly tickets: TicketsRepository, private readonly staff: StaffTicketsRepository) {}
  requireOwned(user: User, id: string) {
    // /tickets is the requester portal for every role. Staff uses distinct
    // scoped endpoints; ADMIN does not bypass ownership in the public portal.
    const row = this.tickets.owned(id, user.id);
    if (!row) throw new NotFoundException('Ticket no encontrado');
    return row;
  }
  assertStaff(user: User) { if (user.role !== UserRole.ADMIN && user.role !== UserRole.TECHNICIAN) throw new ForbiddenException('Acceso exclusivo del personal'); }
  assertAdmin(user: User) { if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Solo administradores pueden asignar o trasladar tickets'); }
  requireStaff(user: User, id: string) {
    this.assertStaff(user); const row = this.staff.get(user, id);
    if (!row) throw new NotFoundException('Ticket no encontrado'); return row;
  }
  canEdit(user: User, ticket: Ticket) { return ticket.status !== 'CLOSED' && (user.role === UserRole.ADMIN || (user.role === UserRole.TECHNICIAN && ticket.assignedToId === user.id)); }
  assertEdit(user: User, ticket: Ticket) { this.assertWritable(ticket); if (!this.canEdit(user, ticket)) throw new ForbiddenException('Solo el técnico responsable o un administrador puede modificar este ticket'); }
  assertWritable(ticket: Ticket) { if (ticket.status === 'CLOSED') throw new ConflictException('Los tickets cerrados son de solo lectura'); }
}
