import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@uni/shared';
import type { User } from '../../database/schema';
import { DepartmentsRepository } from '../../database/repositories/departments.repository';
@Injectable()
export class DepartmentAccessPolicy {
  constructor(private readonly departments: DepartmentsRepository) {}
  assertManage(user: User) { if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Solo administradores pueden gestionar departamentos'); }
  assertRead(user: User, id: string) {
    if (user.role !== UserRole.ADMIN && (user.role !== UserRole.TECHNICIAN || !this.departments.membership(id, user.id))) throw new NotFoundException('Departamento no encontrado');
  }
}
