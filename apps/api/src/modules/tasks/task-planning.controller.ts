import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, uuidSchema, kanbanPageSchema, taskRelationsQuerySchema, taskParentPatchSchema, taskDependencyCreateSchema, taskTemplateCreateSchema, taskTemplatePatchSchema, taskTemplateSaveSchema, taskFromTemplateSchema } from '@uni/shared';
import type { KanbanPage, TaskRelationsQuery, TaskTemplateCreate, TaskTemplatePatch, TaskFromTemplate } from '@uni/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import type { User } from '../../database/schema';
import { TaskPlanningService } from './task-planning.service';
@ApiTags('Task planning') @ApiCookieAuth('session') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN) @Controller('tasks')
export class TaskPlanningController {
  constructor(private readonly planning: TaskPlanningService) {}
  @Get(':id/relations') relations(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(taskRelationsQuerySchema)) q: TaskRelationsQuery) { return this.planning.relations(u, id, q); }
  @Patch(':id/parent') parent(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskParentPatchSchema)) body: { parentTaskId: string | null }) { return this.planning.parent(u, id, body.parentTaskId); }
  @Post(':id/dependencies') dependency(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskDependencyCreateSchema)) body: { blockingTaskId: string }) { return this.planning.addDependency(u, id, body.blockingTaskId); }
  @Delete(':id/dependencies/:blockingTaskId') @HttpCode(204) remove(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('blockingTaskId', new ZodPipe(uuidSchema)) blockingTaskId: string) { this.planning.removeDependency(u, id, blockingTaskId); }
  @Post(':id/template') template(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskTemplateSaveSchema)) body: { name: string }) { return this.planning.saveTemplate(u, id, body.name); }
}
@ApiTags('Task planning') @ApiCookieAuth('session') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN) @Controller('boards/:id/templates')
export class TaskTemplatesController {
  constructor(private readonly planning: TaskPlanningService) {}
  @Get() list(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(kanbanPageSchema)) q: KanbanPage) { return this.planning.templates(u, id, q); }
  @Post() create(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskTemplateCreateSchema)) body: TaskTemplateCreate) { return this.planning.createTemplate(u, id, body); }
  @Patch(':templateId') update(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('templateId', new ZodPipe(uuidSchema)) templateId: string, @Body(new ZodPipe(taskTemplatePatchSchema)) body: TaskTemplatePatch) { return this.planning.updateTemplate(u, id, templateId, body); }
  @Delete(':templateId') @HttpCode(204) remove(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('templateId', new ZodPipe(uuidSchema)) templateId: string) { this.planning.deleteTemplate(u, id, templateId); }
  @Post(':templateId/tasks') apply(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('templateId', new ZodPipe(uuidSchema)) templateId: string, @Body(new ZodPipe(taskFromTemplateSchema)) body: TaskFromTemplate) { return this.planning.fromTemplate(u, id, templateId, body); }
}
