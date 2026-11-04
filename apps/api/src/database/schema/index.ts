import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export * from './identity';

// Versioned operational metadata, not application settings or secrets.
export const applicationMetadata = sqliteTable('application_metadata', {
  key: text('key').primaryKey(), value: text('value').notNull(), updatedAt: integer('updated_at').notNull(),
});

export * from './categories';

export * from './tickets';
export * from './notifications';

export * from './kanban';

export * from './task-links';
