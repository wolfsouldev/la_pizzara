import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdminList, DepartmentInput, DepartmentPatch } from '@uni/shared';
import type { User } from '../../database/schema';
import { DepartmentsRepository } from '../../database/repositories/departments.repository';
import { UsersRepository } from '../../database/repositories/users.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { DepartmentAccessPolicy } from '../../common/policies/department-access.policy';
import { PaginatedResult } from '../../common/pagination';
@Injectable()
export class DepartmentsService {
  constructor(private readonly departments: DepartmentsRepository, private readonly users: UsersRepository, private readonly audit: AuditRepository,
    private readonly unit: DatabaseUnitOfWork, private readonly policy: DepartmentAccessPolicy) {}
  get(actor: User, id: string) { this.policy.assertManage(actor); const d = this.departments.get(id); if (!d) throw new NotFoundException('Departamento no encontrado'); return d; }
  list(actor: User, q: AdminList) { this.policy.assertManage(actor); return new PaginatedResult(this.departments.list(q), q); }
  catalog() { return this.departments.catalog(); }
  create(actor: User, input: DepartmentInput) {
    this.policy.assertManage(actor); return this.unit.run(() => { const d = this.departments.create(input); this.audit.record(actor.id, 'DEPARTMENT_CREATED', 'department', d.id, { name: d.name }); return d; });
  }
  update(actor: User, id: string, patch: DepartmentPatch) {
    return this.unit.run(() => { const before = this.get(actor, id); const after = this.departments.update(id, patch); this.audit.record(actor.id, 'DEPARTMENT_UPDATED', 'department', id, { before, after }); return after; });
  }
  members(actor: User, id: string, q: AdminList) { this.get(actor, id); return new PaginatedResult(this.departments.members(id, q), q); }
  addMember(actor: User, id: string, userId: string) {
    return this.unit.run(() => {
      const d = this.get(actor, id); const u = this.users.get(userId);
      if (!u) throw new NotFoundException('Usuario no encontrado');
      if (!d.isActive) throw new ConflictException('Activa el departamento antes de incorporar técnicos');
      if (!u.isActive || u.role !== 'TECHNICIAN') throw new ConflictException('El miembro debe ser un técnico activo');
      if (this.departments.membership(id, userId)) throw new ConflictException('El técnico ya pertenece al departamento');
      this.departments.addMember(id, userId); this.audit.record(actor.id, 'DEPARTMENT_MEMBER_ADDED', 'department', id, { userId });
      return { ...u, joinedAt: this.departments.membership(id, userId)!.createdAt };
    });
  }
  removeMember(actor: User, id: string, userId: string) {
    this.unit.run(() => { this.get(actor, id); if (!this.departments.membership(id, userId)) throw new NotFoundException('Pertenencia no encontrada');
      if (this.departments.hasAssignedTickets(id, userId)) throw new ConflictException('Reasigna primero los tickets no cerrados del técnico en este departamento');
      if (this.departments.hasBoardMembership(id, userId)) throw new ConflictException('Retira primero las pertenencias del técnico a los tableros del departamento');
      this.departments.removeMember(id, userId); this.audit.record(actor.id, 'DEPARTMENT_MEMBER_REMOVED', 'department', id, { userId }); });
  }
}
