import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, primaryKey, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { priorities } from '@uni/shared';
import { boards, tasks } from './kanban';
export const taskParents = sqliteTable('task_parents', {
  childId: text('child_id').primaryKey().references(() => tasks.id), parentId: text('parent_id').notNull().references(() => tasks.id),
}, t => [index('task_parents_parent_idx').on(t.parentId), check('task_parent_not_self', sql`${t.childId} != ${t.parentId}`)]);
export const taskDependencies = sqliteTable('task_dependencies', {
  blockingTaskId: text('blocking_task_id').notNull().references(() => tasks.id), blockedTaskId: text('blocked_task_id').notNull().references(() => tasks.id),
}, t => [primaryKey({ columns: [t.blockingTaskId, t.blockedTaskId] }), index('task_dependencies_blocked_idx').on(t.blockedTaskId), check('task_dependency_not_self', sql`${t.blockingTaskId} != ${t.blockedTaskId}`)]);
export const taskTemplates = sqliteTable('task_templates', {
  id: text('id').primaryKey(), boardId: text('board_id').notNull().references(() => boards.id), name: text('name').notNull(), nameKey: text('name_key').notNull(), title: text('title').notNull(), description: text('description'), priority: text('priority', { enum: priorities }).notNull().default('NORMAL'), dueInDays: integer('due_in_days'), checklist: text('checklist', { mode: 'json' }).$type<string[]>().notNull(), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, t => [uniqueIndex('task_templates_board_name_unique').on(t.boardId, t.nameKey), check('task_template_priority_check', sql`${t.priority} in ('LOW','NORMAL','HIGH','URGENT')`), check('task_template_due_days_check', sql`${t.dueInDays} is null or (${t.dueInDays} >= 0 and ${t.dueInDays} <= 3650)`)]);
