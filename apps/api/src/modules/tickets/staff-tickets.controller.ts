import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, staffTicketListSchema, ticketCommentsQuerySchema, ticketStatusChangeSchema, ticketPriorityChangeSchema, ticketAssignmentChangeSchema, ticketDepartmentChangeSchema, staffCommentCreateSchema, uuidSchema } from '@uni/shared';
import type { StaffTicketList, TicketCommentsQuery, TicketStatus, TicketDepartmentChange, StaffCommentCreate } from '@uni/shared';
import type { User, Ticket } from '../../database/schema';
import { CurrentUser, Roles } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import { StaffTicketsService } from './staff-tickets.service';
@ApiTags('staff') @ApiCookieAuth('session') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN) @Controller('staff/tickets')
export class StaffTicketsController {
  constructor(private readonly service: StaffTicketsService) {}
  @Get() list(@CurrentUser() u: User, @Query(new ZodPipe(staffTicketListSchema)) q: StaffTicketList) { return this.service.list(u, q); }
  @Get('options') options(@CurrentUser() u: User) { return this.service.options(u); }
  @Get(':id') detail(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.service.detail(u, id); }
  @Get(':id/comments') comments(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(ticketCommentsQuerySchema)) q: TicketCommentsQuery) { return this.service.comments(u, id, q); }
  @Get(':id/events') events(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(ticketCommentsQuerySchema)) q: TicketCommentsQuery) { return this.service.events(u, id, q); }
  @Patch(':id/status') status(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(ticketStatusChangeSchema)) body: { status: TicketStatus }) { return this.service.status(u, id, body.status); }
  @Patch(':id/priority') priority(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(ticketPriorityChangeSchema)) body: { priority: Ticket['priority'] }) { return this.service.priority(u, id, body.priority); }
  @Patch(':id/assignment') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) assignment(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(ticketAssignmentChangeSchema)) body: { assignedToId: string | null }) { return this.service.assignment(u, id, body.assignedToId); }
  @Patch(':id/department') @Roles(UserRole.SUPER_ADMIN) department(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(ticketDepartmentChangeSchema)) body: TicketDepartmentChange) { return this.service.department(u, id, body); }
  @Post(':id/comments') comment(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(staffCommentCreateSchema)) body: StaffCommentCreate) { return this.service.comment(u, id, body); }
}
@ApiTags('dashboard') @ApiCookieAuth('session') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN) @Controller('staff/dashboard')
export class StaffDashboardController {
  constructor(private readonly service: StaffTicketsService) {}
  @Get() get(@CurrentUser() u: User) { return this.service.dashboard(u); }
}
@ApiTags('dashboard') @ApiCookieAuth('session') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly service: StaffTicketsService) {}
  @Get() get(@CurrentUser() u: User) { return this.service.dashboard(u, true); }
}
