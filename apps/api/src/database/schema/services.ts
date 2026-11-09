import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { serviceStatuses } from '@uni/shared';
import { users } from './identity';
export const universityServices = sqliteTable('university_services', {
  id: text('id').primaryKey(), name: text('name').notNull(), nameKey: text('name_key').notNull(), description: text('description').notNull(), url: text('url'),
  status: text('status', { enum: serviceStatuses }).notNull().default('UNKNOWN'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  statusUpdatedAt: integer('status_updated_at').notNull(), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, t => [uniqueIndex('university_services_name_unique').on(t.nameKey), index('university_services_active_status_idx').on(t.isActive, t.status), check('service_status_check', sql`${t.status} in ('OPERATIONAL','DEGRADED','OUTAGE','MAINTENANCE','UNKNOWN')`)]);
export const serviceNotes = sqliteTable('service_notes', {
  id: text('id').primaryKey(), serviceId: text('service_id').notNull().references(() => universityServices.id),
  authorId: text('author_id').notNull().references(() => users.id), body: text('body').notNull(),
  visibility: text('visibility', { enum: ['PUBLIC', 'INTERNAL'] }).notNull(), createdAt: integer('created_at').notNull(),
}, t => [index('service_notes_service_visibility_created_idx').on(t.serviceId, t.visibility, t.createdAt), check('service_note_visibility_check', sql`${t.visibility} in ('PUBLIC','INTERNAL')`)]);
