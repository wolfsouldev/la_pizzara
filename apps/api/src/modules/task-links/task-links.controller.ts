import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, uuidSchema, kanbanPageSchema, taskTicketLinkCreateSchema, taskFromTicketCreateSchema, type KanbanPage, type TaskFromTicketCreate } from '@uni/shared';
import type { User } from '../../database/schema';
import { CurrentUser, Roles } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import { TaskLinksService } from './task-links.service';
@ApiTags('task-ticket-links') @ApiCookieAuth('session') @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICIAN) @Controller()
export class TaskLinksController {
  constructor(private readonly links: TaskLinksService) {}
  @Get('tasks/:id/tickets') tickets(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(kanbanPageSchema)) q: KanbanPage) { return this.links.tickets(u, id, q); }
  @Post('tasks/:id/tickets') link(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskTicketLinkCreateSchema)) body: { ticketId: string }) { return this.links.link(u, id, body.ticketId); }
  @Delete('tasks/:id/tickets/:ticketId') @HttpCode(204) unlink(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('ticketId', new ZodPipe(uuidSchema)) ticketId: string) { this.links.unlink(u, id, ticketId); }
  @Get('staff/tickets/:id/tasks') tasks(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(kanbanPageSchema)) q: KanbanPage) { return this.links.tasksForTicket(u, id, q); }
  @Post('staff/tickets/:id/tasks') create(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskFromTicketCreateSchema)) body: TaskFromTicketCreate) { return this.links.createFromTicket(u, id, body); }
}
