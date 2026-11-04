import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, check } from 'drizzle-orm/sqlite-core';
import { ticketStatuses, priorities, ticketEventTypes } from '@uni/shared';
import { users, departments } from './identity';
import { ticketCategories } from './categories';
export const ticketCounters = sqliteTable('ticket_counters', { key: text('key').primaryKey(), nextValue: integer('next_value').notNull() }, t => [check('counter_positive', sql`${t.nextValue} >= 1`)]);
export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(), ticketNumber: integer('ticket_number').notNull().unique(), title: text('title').notNull(), description: text('description').notNull(),
  requesterId: text('requester_id').notNull().references(() => users.id), departmentId: text('department_id').notNull().references(() => departments.id), categoryId: text('category_id').notNull().references(() => ticketCategories.id), assignedToId: text('assigned_to_id').references(() => users.id),
  status: text('status', { enum: ticketStatuses }).notNull(), priority: text('priority', { enum: priorities }).notNull().default('NORMAL'),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(), assignedAt: integer('assigned_at'), resolvedAt: integer('resolved_at'), closedAt: integer('closed_at'),
}, t => [index('tickets_requester_created_idx').on(t.requesterId, t.createdAt), index('tickets_department_status_idx').on(t.departmentId, t.status), index('tickets_assignee_status_idx').on(t.assignedToId, t.status), index('tickets_category_idx').on(t.categoryId), index('tickets_priority_idx').on(t.priority), index('tickets_created_idx').on(t.createdAt),
  check('ticket_status_check', sql`${t.status} in ('OPEN','ASSIGNED','IN_PROGRESS','WAITING_USER','RESOLVED','CLOSED')`), check('ticket_priority_check', sql`${t.priority} in ('LOW','NORMAL','HIGH','URGENT')`), check('ticket_number_positive', sql`${t.ticketNumber} >= 1`)]);
export type Ticket = typeof tickets.$inferSelect;
export const ticketComments = sqliteTable('ticket_comments', {
  id: text('id').primaryKey(), ticketId: text('ticket_id').notNull().references(() => tickets.id), authorId: text('author_id').notNull().references(() => users.id), body: text('body').notNull(), visibility: text('visibility', { enum: ['PUBLIC', 'INTERNAL'] }).notNull(), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, t => [index('ticket_comments_visibility_created_idx').on(t.ticketId, t.visibility, t.createdAt), check('comment_visibility_check', sql`${t.visibility} in ('PUBLIC','INTERNAL')`)]);
export const ticketEvents = sqliteTable('ticket_events', {
  id: text('id').primaryKey(), ticketId: text('ticket_id').notNull().references(() => tickets.id), actorId: text('actor_id').references(() => users.id), eventType: text('event_type', { enum: ticketEventTypes }).notNull(), metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(), createdAt: integer('created_at').notNull(),
}, t => [index('ticket_events_ticket_created_idx').on(t.ticketId, t.createdAt), check('ticket_event_type_check', sql`${t.eventType} in ('CREATED','ASSIGNED','REASSIGNED','STATUS_CHANGED','PRIORITY_CHANGED','COMMENT_ADDED','RESOLVED','REOPENED','CLOSED')`)]);
