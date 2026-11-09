import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { UserList, UserRole } from '@uni/shared';
import type { User } from '../../database/schema';
import { UsersRepository } from '../../database/repositories/users.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { DepartmentAccessPolicy } from '../../common/policies/department-access.policy';
import { PaginatedResult } from '../../common/pagination';
@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository, private readonly audit: AuditRepository, private readonly unit: DatabaseUnitOfWork, private readonly policy: DepartmentAccessPolicy) {}
  list(actor: User, q: UserList) { this.policy.assertSuperAdmin(actor); return new PaginatedResult(this.users.list(q), q); }
  get(actor: User, id: string) { this.policy.assertSuperAdmin(actor); const u = this.users.get(id); if (!u) throw new NotFoundException('Usuario no encontrado'); return { ...u, departments: this.users.departments(id) }; }
  change(actor: User, id: string, patch: { role?: UserRole; isActive?: boolean }) {
    this.policy.assertSuperAdmin(actor); return this.unit.run(() => {
      const before = this.users.get(id); if (!before) throw new NotFoundException('Usuario no encontrado');
      const role = patch.role ?? before.role; const active = patch.isActive ?? before.isActive;
      if (role === 'SUPER_ADMIN' || before.role === 'SUPER_ADMIN') throw new ConflictException('El rol de superadministrador solo se concede mediante la CLI y no se modifica desde la web');
      if (patch.role !== undefined && before.authProvider === 'ldap') throw new ConflictException('El rol institucional se deriva del grupo Domain Users de Active Directory');
      if (before.role === 'ADMIN' && before.isActive && (role !== 'ADMIN' || !active) && this.users.activeAdmins() <= 1) throw new ConflictException('No se puede quitar el privilegio ni desactivar al último administrador activo');
      if (role === 'USER' && this.users.membershipCount(id) > 0) throw new ConflictException('Retira primero las pertenencias del técnico a departamentos');
      if (before.role === role && before.isActive === active) return before;
      const after = this.users.change(id, patch);
      this.audit.record(actor.id, patch.role !== undefined ? 'USER_ROLE_CHANGED' : 'USER_STATUS_CHANGED', 'user', id, { before: { role: before.role, isActive: before.isActive }, after: { role: after.role, isActive: after.isActive } });
      return after;
    });
  }
}
