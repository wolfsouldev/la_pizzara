import { Body, Controller, Delete, Get, HttpCode, Param, Post, Patch, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, adminListSchema, departmentCreateSchema, departmentPatchSchema, memberCreateSchema, uuidSchema } from '@uni/shared';
import type { AdminList, DepartmentInput, DepartmentPatch } from '@uni/shared';
import type { User } from '../../database/schema';
import { CurrentUser, Roles } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import { DepartmentsService } from './departments.service';
@ApiTags('departments') @ApiCookieAuth('session') @Roles(UserRole.ADMIN) @Controller('admin/departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}
  @Get() list(@CurrentUser() u: User, @Query(new ZodPipe(adminListSchema)) q: AdminList) { return this.service.list(u, q); }
  @Post() create(@CurrentUser() u: User, @Body(new ZodPipe(departmentCreateSchema)) body: DepartmentInput) { return this.service.create(u, body); }
  @Get(':id') get(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.service.get(u, id); }
  @Patch(':id') update(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(departmentPatchSchema)) body: DepartmentPatch) { return this.service.update(u, id, body); }
  @Get(':id/members') members(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(adminListSchema)) q: AdminList) { return this.service.members(u, id, q); }
  @Post(':id/members') add(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(memberCreateSchema)) body: { userId: string }) { return this.service.addMember(u, id, body.userId); }
  @Delete(':id/members/:userId') @HttpCode(204) remove(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('userId', new ZodPipe(uuidSchema)) userId: string) { this.service.removeMember(u, id, userId); }
}
