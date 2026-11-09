import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, serviceCreateSchema, servicePatchSchema, serviceListSchema, adminServiceListSchema, serviceNoteQuerySchema, serviceNoteCreateSchema, ticketServiceLinkSchema, uuidSchema } from '@uni/shared';
import type { ServiceCreate, ServicePatch, ServiceList, AdminServiceList, ServiceNoteCreate } from '@uni/shared';
import type { User } from '../../database/schema';
import { CurrentUser, Roles } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import { ServicesService } from './services.service';
@ApiTags('University services') @ApiCookieAuth('session') @Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}
  @Get() list(@Query(new ZodPipe(serviceListSchema)) q: ServiceList) { return this.services.list(q); }
  @Get(':id') get(@Param('id', new ZodPipe(uuidSchema)) id: string) { return this.services.get(id); }
  @Get(':id/notes') notes(@Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(serviceNoteQuerySchema)) q: { page: number; limit: number }) { return this.services.notes(id, q); }
}
@ApiTags('University services') @ApiCookieAuth('session') @Roles(UserRole.ADMIN) @Controller('admin/services')
export class AdminServicesController {
  constructor(private readonly services: ServicesService) {}
  @Get() list(@CurrentUser() u: User, @Query(new ZodPipe(adminServiceListSchema)) q: AdminServiceList) { return this.services.adminList(u, q); }
  @Get(':id') get(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.services.adminGet(u, id); }
  @Post() create(@CurrentUser() u: User, @Body(new ZodPipe(serviceCreateSchema)) body: ServiceCreate) { return this.services.create(u, body); }
  @Patch(':id') patch(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(servicePatchSchema)) body: ServicePatch) { return this.services.patch(u, id, body); }
  @Get(':id/notes') notes(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(serviceNoteQuerySchema)) q: { page: number; limit: number }) { return this.services.adminNotes(u, id, q); }
  @Post(':id/notes') addNote(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(serviceNoteCreateSchema)) body: ServiceNoteCreate) { return this.services.addNote(u, id, body); }
  @Delete(':id/notes/:noteId') deleteNote(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('noteId', new ZodPipe(uuidSchema)) noteId: string) { return this.services.deleteNote(u, id, noteId); }
}
@ApiTags('University services') @ApiCookieAuth('session') @Controller('tickets/:id/service')
export class TicketServiceController {
  constructor(private readonly services: ServicesService) {}
  @Get() get(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.services.ticket(u, id, false); }
  @Patch() link(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(ticketServiceLinkSchema)) body: { serviceId: string | null }) { return this.services.link(u, id, body.serviceId, false); }
}
@ApiTags('University services') @ApiCookieAuth('session') @Roles(UserRole.ADMIN, UserRole.TECHNICIAN) @Controller('staff/tickets/:id/service')
export class StaffTicketServiceController {
  constructor(private readonly services: ServicesService) {}
  @Get() get(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.services.ticket(u, id, true); }
  @Patch() link(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(ticketServiceLinkSchema)) body: { serviceId: string | null }) { return this.services.link(u, id, body.serviceId, true); }
}
