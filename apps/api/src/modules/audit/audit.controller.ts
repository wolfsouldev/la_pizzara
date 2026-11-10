import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, adminListSchema } from '@uni/shared';
import type { AdminList } from '@uni/shared';
import type { User } from '../../database/schema';
import { Roles, CurrentUser } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import { AuditService } from './audit.service';
@ApiTags('audit') @ApiCookieAuth('session') @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) @Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly service: AuditService) {}
  @Get() list(@CurrentUser() u: User, @Query(new ZodPipe(adminListSchema)) q: AdminList) { return this.service.list(u, q); }
}
