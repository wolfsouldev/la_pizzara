import { Injectable } from '@nestjs/common';
import type { AdminList } from '@uni/shared';
import type { User } from '../../database/schema';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { DepartmentAccessPolicy } from '../../common/policies/department-access.policy';
import { PaginatedResult } from '../../common/pagination';
@Injectable()
export class AuditService {
  constructor(private readonly audit: AuditRepository, private readonly policy: DepartmentAccessPolicy) {}
  list(actor: User, q: AdminList) { this.policy.assertAdmin(actor); return new PaginatedResult(this.audit.list(q), q); }
}
