import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { tasks } from './kanban';
import { tickets } from './tickets';
import { users } from './identity';
export const taskTicketLinks = sqliteTable('task_ticket_links', {
  taskId: text('task_id').notNull().references(() => tasks.id),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  createdById: text('created_by_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
}, t => [primaryKey({ columns: [t.taskId, t.ticketId] }), index('task_ticket_links_ticket_idx').on(t.ticketId)]);
