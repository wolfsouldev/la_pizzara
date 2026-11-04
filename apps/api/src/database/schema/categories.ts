import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { departments } from './identity';
export const ticketCategories = sqliteTable('ticket_categories', {
  id: text('id').primaryKey(), departmentId: text('department_id').notNull().references(() => departments.id),
  name: text('name').notNull(), slug: text('slug').notNull(), description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, t => [uniqueIndex('categories_department_slug_unique').on(t.departmentId, t.slug), index('categories_department_active_idx').on(t.departmentId, t.isActive)]);
