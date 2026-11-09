import { TaskPlanningRepository } from '../../database/repositories/task-planning.repository';
import { TaskPlanningService } from '../tasks/task-planning.service';
import { TaskPlanningController, TaskTemplatesController } from '../tasks/task-planning.controller';
import { Module } from '@nestjs/common';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { TasksController } from '../tasks/tasks.controller';
import { TasksService } from '../tasks/tasks.service';
import { BoardsRepository } from '../../database/repositories/boards.repository';
import { TasksRepository } from '../../database/repositories/tasks.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { BoardAccessPolicy } from '../../common/policies/board-access.policy';
import { TaskAccessPolicy } from '../../common/policies/task-access.policy';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
@Module({ exports: [TasksService], controllers: [TaskPlanningController, TaskTemplatesController, BoardsController, TasksController], providers: [TaskPlanningRepository, TaskPlanningService, BoardsService, TasksService, BoardsRepository, TasksRepository, AuditRepository, BoardAccessPolicy, TaskAccessPolicy, DatabaseUnitOfWork] })
export class BoardsModule {}
