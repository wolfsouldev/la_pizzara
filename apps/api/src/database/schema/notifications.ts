import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './identity';
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id), type: text('type').notNull(), title: text('title').notNull(), message: text('message').notNull(), resourceType: text('resource_type'), resourceId: text('resource_id'), readAt: integer('read_at'), createdAt: integer('created_at').notNull(),
}, t => [index('notifications_user_created_idx').on(t.userId, t.createdAt), index('notifications_user_read_idx').on(t.userId, t.readAt)]);
