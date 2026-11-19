import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, calendarRangeSchema, calendarEventInputSchema, calendarRequestInputSchema, calendarRequestListSchema, calendarApproveSchema, calendarRejectSchema, uuidSchema } from '@uni/shared';
import type { CalendarApprove, CalendarEventInput, CalendarRange, CalendarReject, CalendarRequestInput, CalendarRequestList } from '@uni/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import type { User } from '../../database/schema';
import { CalendarService } from './calendar.service';

@ApiTags('Calendar')
@ApiCookieAuth('session')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}
  @Get('events') events(@Query(new ZodPipe(calendarRangeSchema)) q: CalendarRange) { return this.calendar.publicEvents(q); }
  @Get('requests') requests(@CurrentUser() u: User, @Query(new ZodPipe(calendarRequestListSchema)) q: CalendarRequestList) { return this.calendar.ownRequests(u, q); }
  @Post('requests') submit(@CurrentUser() u: User, @Body(new ZodPipe(calendarRequestInputSchema)) body: CalendarRequestInput) { return this.calendar.submit(u, body); }
  @Delete('requests/:id') @HttpCode(204)
  withdraw(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { this.calendar.withdraw(u, id); }
}

@ApiTags('Calendar')
@ApiCookieAuth('session')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/calendar')
export class AdminCalendarController {
  constructor(private readonly calendar: CalendarService) {}
  @Get('events') events(@Query(new ZodPipe(calendarRangeSchema)) q: CalendarRange) { return this.calendar.adminEvents(q); }
  @Post('events') create(@CurrentUser() u: User, @Body(new ZodPipe(calendarEventInputSchema)) body: CalendarEventInput) { return this.calendar.createEvent(u, body); }
  @Patch('events/:id') update(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(calendarEventInputSchema)) body: CalendarEventInput) { return this.calendar.updateEvent(u, id, body); }
  @Delete('events/:id') @HttpCode(204)
  cancel(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { this.calendar.cancelEvent(u, id); }
  @Get('requests') requests(@Query(new ZodPipe(calendarRequestListSchema)) q: CalendarRequestList) { return this.calendar.reviewRequests(q); }
  @Post('requests/:id/approve') approve(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(calendarApproveSchema)) body: CalendarApprove) { return this.calendar.approve(u, id, body); }
  @Post('requests/:id/reject') reject(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(calendarRejectSchema)) body: CalendarReject) { return this.calendar.reject(u, id, body.note); }
}
