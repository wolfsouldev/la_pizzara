import { Body, Controller, Get, Param, Post, Query, HttpCode } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ticketCreateSchema, ticketListSchema, ticketCommentCreateSchema, ticketCommentsQuerySchema, ticketDetailQuerySchema, uuidSchema } from '@uni/shared';
import type { TicketCreate, TicketList, TicketCommentCreate, TicketCommentsQuery, TicketDetailQuery } from '@uni/shared';
import type { User } from '../../database/schema';
import { CurrentUser } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import { TicketsService } from './tickets.service';
@ApiTags('tickets') @ApiCookieAuth('session') @Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}
  @Get('my') list(@CurrentUser() u: User, @Query(new ZodPipe(ticketListSchema)) q: TicketList) { return this.tickets.list(u, q); }
  @Post() create(@CurrentUser() u: User, @Body(new ZodPipe(ticketCreateSchema)) body: TicketCreate) { return this.tickets.create(u, body); }
  @Get(':id') detail(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(ticketDetailQuerySchema)) q: TicketDetailQuery) { return this.tickets.detail(u, id, q); }
  @Get(':id/comments') comments(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(ticketCommentsQuerySchema)) q: TicketCommentsQuery) { return this.tickets.comments(u, id, q); }
  @Post(':id/comments') comment(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(ticketCommentCreateSchema)) body: TicketCommentCreate) { return this.tickets.comment(u, id, body.body); }
  @Post(':id/close') @HttpCode(200) close(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.tickets.close(u, id); }
  @Post(':id/reopen') @HttpCode(200) reopen(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.tickets.reopen(u, id); }
}
