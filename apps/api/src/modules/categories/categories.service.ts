import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CategoryInput, CategoryList, DepartmentPatch } from '@uni/shared';
import type { User } from '../../database/schema';
import { CategoriesRepository } from '../../database/repositories/categories.repository';
import { DepartmentsRepository } from '../../database/repositories/departments.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { DepartmentAccessPolicy } from '../../common/policies/department-access.policy';
import { PaginatedResult } from '../../common/pagination';
@Injectable()
export class CategoriesService {
  constructor(private readonly categories: CategoriesRepository, private readonly departments: DepartmentsRepository, private readonly audit: AuditRepository,
    private readonly unit: DatabaseUnitOfWork, private readonly policy: DepartmentAccessPolicy) {}
  list(actor: User, q: CategoryList) { this.policy.assertManage(actor); return new PaginatedResult(this.categories.list(q), q); }
  catalog(departmentId?: string) { return this.categories.catalog(departmentId); }
  create(actor: User, input: CategoryInput) {
    this.policy.assertManage(actor); return this.unit.run(() => {
      const d = this.departments.get(input.departmentId); if (!d) throw new NotFoundException('Departamento no encontrado');
      if (!d.isActive) throw new ConflictException('No se pueden crear categorías en un departamento inactivo');
      const c = this.categories.create(input); this.audit.record(actor.id, 'CATEGORY_CREATED', 'category', c.id, { name: c.name, departmentId: c.departmentId }); return c;
    });
  }
  update(actor: User, id: string, patch: DepartmentPatch) {
    this.policy.assertManage(actor); return this.unit.run(() => {
      const before = this.categories.get(id); if (!before) throw new NotFoundException('Categoría no encontrada');
      if (patch.isActive === true && !before.isActive && !this.departments.get(before.departmentId)?.isActive) throw new ConflictException('Activa primero el departamento de la categoría');
      const after = this.categories.update(id, patch); this.audit.record(actor.id, 'CATEGORY_UPDATED', 'category', id, { before, after }); return after;
    });
  }
}
