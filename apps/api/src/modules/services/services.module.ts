import { BoardsRepository } from '../../database/repositories/boards.repository';
import { Module } from '@nestjs/common';
import { ServicesRepository } from '../../database/repositories/services.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { TicketsRepository } from '../../database/repositories/tickets.repository';
import { StaffTicketsRepository } from '../../database/repositories/staff-tickets.repository';
import { TicketAccessPolicy } from '../../common/policies/ticket-access.policy';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { ServicesService } from './services.service';
import { ServicesController, AdminServicesController, TicketServiceController, StaffTicketServiceController } from './services.controller';
@Module({ controllers: [ServicesController, AdminServicesController, TicketServiceController, StaffTicketServiceController], providers: [BoardsRepository, ServicesService, ServicesRepository, AuditRepository, TicketsRepository, StaffTicketsRepository, TicketAccessPolicy, DatabaseUnitOfWork], exports: [ServicesService] })
export class ServicesModule {}
