import { ServicesModule } from '../services/services.module';
import { BoardsRepository } from '../../database/repositories/boards.repository';
import { StaffTicketsController, StaffDashboardController, AdminDashboardController } from './staff-tickets.controller';
import { StaffTicketsService } from './staff-tickets.service';
import { StaffTicketsRepository } from '../../database/repositories/staff-tickets.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from '../../database/repositories/tickets.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { TicketAccessPolicy } from '../../common/policies/ticket-access.policy';
@Module({ imports: [ServicesModule], controllers: [TicketsController, StaffTicketsController, StaffDashboardController, AdminDashboardController], providers: [BoardsRepository, StaffTicketsService, StaffTicketsRepository, AuditRepository, TicketsService, TicketsRepository, TicketAccessPolicy, DatabaseUnitOfWork] })
export class TicketsModule {}
