import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { KanbanPage, TaskTemplateCreate, TaskTemplatePatch, TaskFromTemplate, TaskRelationsQuery } from '@uni/shared';
import { TaskPlanningRepository } from '../../database/repositories/task-planning.repository';
import { TasksRepository } from '../../database/repositories/tasks.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { TaskAccessPolicy } from '../../common/policies/task-access.policy';
import { BoardAccessPolicy } from '../../common/policies/board-access.policy';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { PaginatedResult } from '../../common/pagination';
import type { User } from '../../database/schema';
import { TasksService } from './tasks.service';
@Injectable()
export class TaskPlanningService {
  constructor(private readonly planning: TaskPlanningRepository, private readonly tasks: TasksRepository, private readonly taskService: TasksService, private readonly policy: TaskAccessPolicy, private readonly boards: BoardAccessPolicy, private readonly unit: DatabaseUnitOfWork, private readonly audit: AuditRepository) {}
  relations(user: User, id: string, q: TaskRelationsQuery) {
    const { task } = this.policy.require(user, id); const parentId = this.planning.parents(task.boardId).find(p => p.childId === id)?.parentId;
    const result = (kind: 'subtasks' | 'blockedBy' | 'blocks', page: number) => { const query = { page, limit: q.limit }; return new PaginatedResult(this.planning.related(task.boardId, id, kind, query), query); };
    return { parent: parentId ? this.planning.reference(task.boardId, parentId) ?? null : null, subtasks: result('subtasks', q.subtasksPage), blockedBy: result('blockedBy', q.blockedByPage), blocks: result('blocks', q.blocksPage) };
  }
  private record(user: User, id: string, action: string, metadata: Record<string, unknown>) { const now = Date.now(); this.tasks.update(user, id, {}, now); this.tasks.event(id, user.id, 'UPDATED', now, { action, ...metadata }); this.audit.record(user.id, action, 'task', id, metadata); }
  parent(user: User, id: string, parentTaskId: string | null) { return this.unit.run(() => {
    const { task } = this.policy.require(user, id, true); const edges = this.planning.parents(task.boardId); const before = edges.find(p => p.childId === id)?.parentId ?? null;
    if (parentTaskId) {
      const parent = this.policy.require(user, parentTaskId).task;
      if (parent.boardId !== task.boardId || parent.archivedAt !== null) throw new ConflictException('La tarea principal debe estar activa en el mismo tablero');
      const parents = new Map(edges.map(e => [e.childId, e.parentId])); let cursor: string | undefined = parentTaskId; const visited = new Set<string>();
      while (cursor) { if (cursor === id || visited.has(cursor)) throw new ConflictException('La jerarquía no puede contener ciclos'); visited.add(cursor); cursor = parents.get(cursor); }
    }
    if (before !== parentTaskId) { this.planning.setParent(id, parentTaskId); this.record(user, id, 'PARENT_CHANGED', { fromParentId: before, parentTaskId }); }
    return this.taskService.detail(user, id);
  }); }
  addDependency(user: User, id: string, blockingTaskId: string) { return this.unit.run(() => {
    const { task } = this.policy.require(user, id, true); const blocking = this.policy.require(user, blockingTaskId).task;
    if (task.boardId !== blocking.boardId || blocking.archivedAt !== null) throw new ConflictException('La tarea bloqueante debe estar activa en el mismo tablero');
    const edges = this.planning.dependencies(task.boardId);
    if (edges.some(e => e.blockingTaskId === blockingTaskId && e.blockedTaskId === id)) throw new ConflictException('Esta dependencia ya existe');
    if (edges.filter(e => e.blockedTaskId === id).length >= 100) throw new ConflictException('Máximo 100 bloqueantes directas por tarea');
    const outgoing = new Map<string, string[]>(); for (const edge of edges) outgoing.set(edge.blockingTaskId, [...(outgoing.get(edge.blockingTaskId) ?? []), edge.blockedTaskId]);
    const stack = [id]; const visited = new Set<string>();
    while (stack.length) { const next = stack.pop()!; if (next === blockingTaskId) throw new ConflictException('Las dependencias no pueden contener ciclos'); if (visited.has(next)) continue; visited.add(next); stack.push(...(outgoing.get(next) ?? [])); }
    this.planning.addDependency(blockingTaskId, id); this.record(user, id, 'DEPENDENCY_ADDED', { blockingTaskId }); return this.taskService.detail(user, id);
  }); }
  removeDependency(user: User, id: string, blockingTaskId: string) { this.unit.run(() => {
    const { task } = this.policy.require(user, id, true); const blocking = this.policy.require(user, blockingTaskId).task;
    if (task.boardId !== blocking.boardId || !this.planning.removeDependency(blockingTaskId, id)) throw new NotFoundException('Dependencia no encontrada');
    this.record(user, id, 'DEPENDENCY_REMOVED', { blockingTaskId });
  }); }
  templates(user: User, boardId: string, q: KanbanPage) { this.boards.require(user, boardId); return new PaginatedResult(this.planning.templates(boardId, q), q); }
  private template(boardId: string, id: string) { const row = this.planning.template(boardId, id); if (!row) throw new NotFoundException('Plantilla no encontrada en este tablero'); return row; }
  createTemplate(user: User, boardId: string, body: TaskTemplateCreate) { return this.unit.run(() => {
    this.boards.require(user, boardId, 'MANAGE'); if (this.planning.templates(boardId, { page: 1, limit: 1 }).total >= 100) throw new ConflictException('Máximo 100 plantillas por tablero');
    if (this.planning.duplicate(boardId, body.name)) throw new ConflictException('Ya existe una plantilla con ese nombre');
    const row = this.planning.createTemplate(boardId, body, Date.now()); this.audit.record(user.id, 'TASK_TEMPLATE_CREATED', 'board', boardId, { templateId: row.id }); return row;
  }); }
  updateTemplate(user: User, boardId: string, id: string, body: TaskTemplatePatch) { return this.unit.run(() => {
    this.boards.require(user, boardId, 'MANAGE'); this.template(boardId, id); if (body.name && this.planning.duplicate(boardId, body.name, id)) throw new ConflictException('Ya existe una plantilla con ese nombre');
    const row = this.planning.updateTemplate(boardId, id, body, Date.now()); this.audit.record(user.id, 'TASK_TEMPLATE_UPDATED', 'board', boardId, { templateId: id, fields: Object.keys(body) }); return row;
  }); }
  deleteTemplate(user: User, boardId: string, id: string) { this.unit.run(() => { this.boards.require(user, boardId, 'MANAGE'); this.template(boardId, id); this.planning.deleteTemplate(boardId, id); this.audit.record(user.id, 'TASK_TEMPLATE_DELETED', 'board', boardId, { templateId: id }); }); }
  fromTemplate(user: User, boardId: string, templateId: string, input: TaskFromTemplate) { return this.unit.run(() => {
    this.boards.require(user, boardId, 'EDIT'); const template = this.template(boardId, templateId); const now = Date.now();
    const task = this.taskService.create(user, boardId, { columnId: input.columnId, title: input.title ?? template.title, description: input.description === undefined ? template.description : input.description, priority: input.priority ?? template.priority, dueAt: input.dueAt === undefined ? template.dueInDays === null ? null : now + template.dueInDays * 86400000 : input.dueAt, assigneeIds: input.assigneeIds ?? [], labelIds: input.labelIds ?? [], parentTaskId: input.parentTaskId });
    for (const title of template.checklist) this.tasks.addChecklist(task.id, title, now);
    this.tasks.event(task.id, user.id, 'CHECKLIST_CHANGED', now, { action: 'TEMPLATE_APPLIED', templateId, itemCount: template.checklist.length });
    this.audit.record(user.id, 'TASK_TEMPLATE_APPLIED', 'task', task.id, { templateId, boardId }); return this.taskService.detail(user, task.id);
  }); }
  saveTemplate(user: User, id: string, name: string) { return this.unit.run(() => {
    const { task } = this.policy.require(user, id); this.boards.require(user, task.boardId, 'MANAGE'); const checklist = this.planning.checklistSnapshot(id);
    if (checklist.length > 100) throw new ConflictException('Una plantilla admite como máximo 100 elementos de checklist');
    return this.createTemplate(user, task.boardId, { name, title: task.title, description: task.description, priority: task.priority, dueInDays: null, checklist: checklist.map(c => c.title) });
  }); }
}
