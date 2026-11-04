import { Module } from '@nestjs/common';
import { BoardsModule } from '../boards/boards.module';
import { TaskLinksController } from './task-links.controller';
import { TaskLinksService } from './task-links.service';
import { TaskLinksRepository } from '../../database/repositories/task-links.repository';
import { TasksRepository } from '../../database/repositories/tasks.repository';
import { BoardsRepository } from '../../database/repositories/boards.repository';
import { StaffTicketsRepository } from '../../database/repositories/staff-tickets.repository';
import { TicketsRepository } from '../../database/repositories/tickets.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { TaskAccessPolicy } from '../../common/policies/task-access.policy';
import { BoardAccessPolicy } from '../../common/policies/board-access.policy';
import { TicketAccessPolicy } from '../../common/policies/ticket-access.policy';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
@Module({ imports: [BoardsModule], controllers: [TaskLinksController], providers: [TaskLinksService, TaskLinksRepository, TasksRepository, BoardsRepository, StaffTicketsRepository, TicketsRepository, AuditRepository, TaskAccessPolicy, BoardAccessPolicy, TicketAccessPolicy, DatabaseUnitOfWork] })
export class TaskLinksModule {}
