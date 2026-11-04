import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationRealtimeService } from './notification-realtime.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsRepository } from '../../database/repositories/notifications.repository';
import { BoardsRepository } from '../../database/repositories/boards.repository';
import { StaffTicketsRepository } from '../../database/repositories/staff-tickets.repository';
@Global()
@Module({imports:[AuthModule],controllers:[NotificationsController],providers:[NotificationsService,NotificationsRepository,NotificationRealtimeService,NotificationsGateway,BoardsRepository,StaffTicketsRepository],exports:[NotificationsService]})
export class NotificationsModule {}
