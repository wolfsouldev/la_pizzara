import { Module } from '@nestjs/common';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { CalendarRepository } from '../../database/repositories/calendar.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { AdminCalendarController, CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  controllers: [CalendarController, AdminCalendarController],
  providers: [CalendarService, CalendarRepository, AuditRepository, DatabaseUnitOfWork],
})
export class CalendarModule {}
