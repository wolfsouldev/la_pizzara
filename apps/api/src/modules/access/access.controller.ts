import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@uni/shared';
import { Roles } from '../../common/decorators/auth';

// Real role checks, not placeholder dashboards or administrative CRUD.
@ApiTags('access') @ApiCookieAuth('session')
@Controller()
export class AccessController {
  @Get('staff/access') @Roles(UserRole.TECHNICIAN, UserRole.SUPER_ADMIN)
  staff() { return { area: 'staff', message: 'Permiso de atención validado por el servidor' }; }
  @Get('admin/access') @Roles(UserRole.ADMIN)
  admin() { return { area: 'admin', message: 'Permiso de administración validado por el servidor' }; }
}
