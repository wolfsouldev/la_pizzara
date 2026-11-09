import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, userListSchema, userRoleSchema, userStatusSchema, uuidSchema } from '@uni/shared';
import type { UserList } from '@uni/shared';
import type { User } from '../../database/schema';
import { Roles, CurrentUser } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import { UsersService } from './users.service';
@ApiTags('users') @ApiCookieAuth('session') @Roles(UserRole.SUPER_ADMIN) @Controller('admin/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get() list(@CurrentUser() u: User, @Query(new ZodPipe(userListSchema)) q: UserList) { return this.service.list(u, q); }
  @Get(':id') get(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.service.get(u, id); }
  @Patch(':id/role') role(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(userRoleSchema)) body: { role: UserRole }) { return this.service.change(u, id, body); }
  @Patch(':id/status') status(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(userStatusSchema)) body: { isActive: boolean }) { return this.service.change(u, id, body); }
}
