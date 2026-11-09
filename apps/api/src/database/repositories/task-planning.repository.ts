import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, count, eq, inArray } from 'drizzle-orm';
import type { TaskTemplateCreate, TaskTemplatePatch } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { tasks, boardColumns, taskParents, taskDependencies, taskTemplates, taskChecklistItems } from '../schema';
const reference = { id: tasks.id, title: tasks.title, columnId: tasks.columnId, columnName: boardColumns.name, isCompleted: boardColumns.isDone, archivedAt: tasks.archivedAt, dueAt: tasks.dueAt };
const template = { id: taskTemplates.id, boardId: taskTemplates.boardId, name: taskTemplates.name, title: taskTemplates.title, description: taskTemplates.description, priority: taskTemplates.priority, dueInDays: taskTemplates.dueInDays, checklist: taskTemplates.checklist, createdAt: taskTemplates.createdAt, updatedAt: taskTemplates.updatedAt };
@Injectable()
export class TaskPlanningRepository {
  constructor(private readonly database: DatabaseService) {}
  parents(boardId: string) { return this.database.db.select({ childId: taskParents.childId, parentId: taskParents.parentId }).from(taskParents).innerJoin(tasks, eq(tasks.id, taskParents.childId)).where(eq(tasks.boardId, boardId)).all(); }
  dependencies(boardId: string) { return this.database.db.select({ blockingTaskId: taskDependencies.blockingTaskId, blockedTaskId: taskDependencies.blockedTaskId }).from(taskDependencies).innerJoin(tasks, eq(tasks.id, taskDependencies.blockedTaskId)).where(eq(tasks.boardId, boardId)).all(); }
  setParent(childId: string, parentId: string | null) { this.database.db.delete(taskParents).where(eq(taskParents.childId, childId)).run(); if (parentId) this.database.db.insert(taskParents).values({ childId, parentId }).run(); }
  addDependency(blockingTaskId: string, blockedTaskId: string) { this.database.db.insert(taskDependencies).values({ blockingTaskId, blockedTaskId }).run(); }
  removeDependency(blockingTaskId: string, blockedTaskId: string) { return this.database.db.delete(taskDependencies).where(and(eq(taskDependencies.blockingTaskId, blockingTaskId), eq(taskDependencies.blockedTaskId, blockedTaskId))).returning().get(); }
  reference(boardId: string, id: string) { return this.database.db.select(reference).from(tasks).innerJoin(boardColumns, eq(tasks.columnId, boardColumns.id)).where(and(eq(tasks.boardId, boardId), eq(tasks.id, id))).get(); }
  related(boardId: string, id: string, kind: 'subtasks' | 'blockedBy' | 'blocks', q: { page: number; limit: number }) {
    const ids = kind === 'subtasks' ? this.database.db.select({ id: taskParents.childId }).from(taskParents).where(eq(taskParents.parentId, id)) : kind === 'blockedBy' ? this.database.db.select({ id: taskDependencies.blockingTaskId }).from(taskDependencies).where(eq(taskDependencies.blockedTaskId, id)) : this.database.db.select({ id: taskDependencies.blockedTaskId }).from(taskDependencies).where(eq(taskDependencies.blockingTaskId, id));
    const where = and(eq(tasks.boardId, boardId), inArray(tasks.id, ids));
    return { rows: this.database.db.select(reference).from(tasks).innerJoin(boardColumns, eq(tasks.columnId, boardColumns.id)).where(where).orderBy(tasks.createdAt, tasks.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(tasks).where(where).get()!.n };
  }
  template(boardId: string, id: string) { return this.database.db.select(template).from(taskTemplates).where(and(eq(taskTemplates.boardId, boardId), eq(taskTemplates.id, id))).get(); }
  templates(boardId: string, q: { page: number; limit: number }) { const where = eq(taskTemplates.boardId, boardId); return { rows: this.database.db.select(template).from(taskTemplates).where(where).orderBy(taskTemplates.name, taskTemplates.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(taskTemplates).where(where).get()!.n }; }
  duplicate(boardId: string, name: string, except?: string) { return this.database.db.select({ id: taskTemplates.id }).from(taskTemplates).where(and(eq(taskTemplates.boardId, boardId), eq(taskTemplates.nameKey, name.normalize('NFKC').toLocaleLowerCase('es')))).all().some(t => t.id !== except); }
  createTemplate(boardId: string, input: TaskTemplateCreate, now: number) { const id = randomUUID(); this.database.db.insert(taskTemplates).values({ id, boardId, ...input, nameKey: input.name.normalize('NFKC').toLocaleLowerCase('es'), createdAt: now, updatedAt: now }).run(); return this.template(boardId, id)!; }
  updateTemplate(boardId: string, id: string, input: TaskTemplatePatch, now: number) { this.database.db.update(taskTemplates).set({ ...input, ...(input.name ? { nameKey: input.name.normalize('NFKC').toLocaleLowerCase('es') } : {}), updatedAt: now }).where(and(eq(taskTemplates.boardId, boardId), eq(taskTemplates.id, id))).run(); return this.template(boardId, id)!; }
  deleteTemplate(boardId: string, id: string) { this.database.db.delete(taskTemplates).where(and(eq(taskTemplates.boardId, boardId), eq(taskTemplates.id, id))).run(); }
  checklistSnapshot(id: string) { return this.database.db.select({ title: taskChecklistItems.title }).from(taskChecklistItems).where(eq(taskChecklistItems.taskId, id)).orderBy(taskChecklistItems.position, taskChecklistItems.id).limit(101).all(); }
}
