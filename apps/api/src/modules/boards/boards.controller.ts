import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, uuidSchema, boardListSchema, boardCreateSchema, boardPatchSchema, kanbanPageSchema, boardCandidateQuerySchema, boardMemberCreateSchema, boardMemberPatchSchema, columnCreateSchema, columnPatchSchema, columnReorderSchema, taskListSchema, taskCreateSchema, boardLabelInputSchema } from '@uni/shared';
import type { BoardList, BoardCreate, BoardPatch, KanbanPage, BoardCandidateQuery, BoardPermission, ColumnCreate, ColumnPatch, TaskCreate, TaskList, BoardLabelInput } from '@uni/shared';
import type { User } from '../../database/schema';
import { CurrentUser, Roles } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import { BoardsService } from './boards.service';
import { TasksService } from '../tasks/tasks.service';
@ApiTags('kanban') @ApiCookieAuth('session') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN) @Controller('boards')
export class BoardsController {
  constructor(private readonly boards: BoardsService, private readonly tasks: TasksService) {}
  @Get() list(@CurrentUser() u: User, @Query(new ZodPipe(boardListSchema)) q: BoardList) { return this.boards.list(u, q); }
  @Post() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) create(@CurrentUser() u: User, @Body(new ZodPipe(boardCreateSchema)) body: BoardCreate) { return this.boards.create(u, body); }
  @Get(':id') detail(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.boards.detail(u, id); }
  @Patch(':id') update(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(boardPatchSchema)) body: BoardPatch) { return this.boards.update(u, id, body); }
  @Post(':id/archive') @HttpCode(200) archive(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string) { return this.boards.archive(u, id); }
  @Get(':id/members') members(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(kanbanPageSchema)) q: KanbanPage) { return this.boards.members(u, id, q); }
  @Get(':id/candidates') candidates(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(boardCandidateQuerySchema)) q: BoardCandidateQuery) { return this.boards.candidates(u, id, q); }
  @Post(':id/members') addMember(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(boardMemberCreateSchema)) body: { userId: string; permission: BoardPermission }) { return this.boards.addMember(u, id, body.userId, body.permission); }
  @Patch(':id/members/:userId') changeMember(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('userId', new ZodPipe(uuidSchema)) userId: string, @Body(new ZodPipe(boardMemberPatchSchema)) body: { permission: BoardPermission }) { return this.boards.changeMember(u, id, userId, body.permission); }
  @Delete(':id/members/:userId') @HttpCode(204) removeMember(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('userId', new ZodPipe(uuidSchema)) userId: string) { this.boards.removeMember(u, id, userId); }
  @Post(':id/columns') addColumn(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(columnCreateSchema)) body: ColumnCreate) { return this.boards.addColumn(u, id, body); }
  @Patch(':id/columns/reorder') reorder(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(columnReorderSchema)) body: { columnIds: string[] }) { return this.boards.reorder(u, id, body.columnIds); }
  @Patch(':id/columns/:columnId') updateColumn(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('columnId', new ZodPipe(uuidSchema)) columnId: string, @Body(new ZodPipe(columnPatchSchema)) body: ColumnPatch) { return this.boards.updateColumn(u, id, columnId, body); }
  @Delete(':id/columns/:columnId') @HttpCode(204) removeColumn(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('columnId', new ZodPipe(uuidSchema)) columnId: string) { this.boards.removeColumn(u, id, columnId); }
  @Get(':id/labels') labels(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(kanbanPageSchema)) q: KanbanPage) { return this.tasks.labels(u, id, q); }
  @Post(':id/labels') createLabel(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(boardLabelInputSchema)) body: BoardLabelInput) { return this.tasks.createLabel(u, id, body); }
  @Patch(':id/labels/:labelId') updateLabel(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('labelId', new ZodPipe(uuidSchema)) labelId: string, @Body(new ZodPipe(boardLabelInputSchema)) body: BoardLabelInput) { return this.tasks.updateLabel(u, id, labelId, body); }
  @Delete(':id/labels/:labelId') @HttpCode(204) deleteLabel(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Param('labelId', new ZodPipe(uuidSchema)) labelId: string) { this.tasks.deleteLabel(u, id, labelId); }
  @Get(':id/tasks') taskList(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Query(new ZodPipe(taskListSchema)) q: TaskList) { return this.tasks.list(u, id, q); }
  @Post(':id/tasks') taskCreate(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(taskCreateSchema)) body: TaskCreate) { return this.tasks.create(u, id, body); }
}
