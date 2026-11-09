import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, uuidSchema, taskPatchSchema, taskMoveSchema, taskAssigneeCreateSchema, taskCommentCreateSchema, kanbanPageSchema, checklistCreateSchema, checklistPatchSchema } from '@uni/shared';
import type { TaskPatch, TaskMove, KanbanPage, ChecklistPatch } from '@uni/shared';
import type { User } from '../../database/schema';
import { CurrentUser, Roles } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import { TasksService } from './tasks.service';
@ApiTags('kanban') @ApiCookieAuth('session') @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICIAN) @Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}
  @Get(':id') detail(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.tasks.detail(u, id); }
  @Patch(':id') update(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskPatchSchema)) body: TaskPatch) { return this.tasks.update(u, id, body); }
  @Post(':id/move') @HttpCode(200) move(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskMoveSchema)) body: TaskMove) { return this.tasks.move(u, id, body); }
  @Post(':id/archive') @HttpCode(200) archive(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.tasks.archive(u, id); }
  @Post(':id/assignees') assign(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskAssigneeCreateSchema)) body: { userId: string }) { return this.tasks.assign(u, id, body.userId); }
  @Delete(':id/assignees/:userId') @HttpCode(204) unassign(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('userId', new ZodPipe(uuidSchema)) userId: string) { this.tasks.unassign(u, id, userId); }
  @Get(':id/comments') comments(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(kanbanPageSchema)) q: KanbanPage) { return this.tasks.comments(u, id, q); }
  @Post(':id/comments') comment(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskCommentCreateSchema)) body: { body: string }) { return this.tasks.comment(u, id, body.body); }
  @Get(':id/checklist') checklist(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(kanbanPageSchema)) q: KanbanPage) { return this.tasks.checklist(u, id, q); }
  @Post(':id/checklist') addChecklist(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(checklistCreateSchema)) body: { title: string }) { return this.tasks.addChecklist(u, id, body.title); }
  @Patch(':id/checklist/:itemId') updateChecklist(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('itemId', new ZodPipe(uuidSchema)) itemId: string, @Body(new ZodPipe(checklistPatchSchema)) body: ChecklistPatch) { return this.tasks.updateChecklist(u, id, itemId, body); }
  @Delete(':id/checklist/:itemId') @HttpCode(204) removeChecklist(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('itemId', new ZodPipe(uuidSchema)) itemId: string) { this.tasks.removeChecklist(u, id, itemId); }
  @Get(':id/events') events(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(kanbanPageSchema)) q: KanbanPage) { return this.tasks.events(u, id, q); }
}
