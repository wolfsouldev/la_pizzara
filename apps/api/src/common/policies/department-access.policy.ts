import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isAdminRole, UserRole } from '@uni/shared';
import type { User } from '../../database/schema';
import { DepartmentsRepository } from '../../database/repositories/departments.repository';
@Injectable()
export class DepartmentAccessPolicy {
  constructor(private readonly departments: DepartmentsRepository) {}
  assertManage(user: User) { if (!isAdminRole(user.role)) throw new ForbiddenException('Solo administradores pueden gestionar departamentos'); }
  assertSuperAdmin(user: User) { if (user.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException('Solo superadministradores pueden gestionar accesos sensibles'); }
  assertRead(user: User, id: string) {
    if (!isAdminRole(user.role) && (user.role !== UserRole.TECHNICIAN || !this.departments.membership(id, user.id))) throw new NotFoundException('Departamento no encontrado');
  }
}
