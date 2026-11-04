import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex, check, primaryKey } from 'drizzle-orm/sqlite-core';
import { UserRole } from '@uni/shared';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  authProvider: text('auth_provider', { enum: ['local', 'ldap'] }).notNull(),
  externalId: text('external_id'),
  username: text('username').notNull(),
  usernameNormalized: text('username_normalized').notNull(),
  displayName: text('display_name').notNull(),
  email: text('email'),
  adDepartment: text('ad_department'),
  role: text('role', { enum: [UserRole.USER, UserRole.TECHNICIAN, UserRole.ADMIN] }).notNull().default(UserRole.USER),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: integer('last_login_at'),
  directoryCheckedAt: integer('directory_checked_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, t => [
  uniqueIndex('users_external_unique').on(t.authProvider, t.externalId).where(sql`${t.externalId} is not null`),
  uniqueIndex('users_username_unique').on(t.authProvider, t.usernameNormalized),
  index('users_role_active_idx').on(t.role, t.isActive),
  check('users_role_check', sql`${t.role} in ('USER','TECHNICIAN','ADMIN')`),
  check('users_provider_check', sql`${t.authProvider} in ('local','ldap')`),
]);
export type User = typeof users.$inferSelect;

export const localCredentials = sqliteTable('local_credentials', {
  userId: text('user_id').primaryKey().references(() => users.id),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const authSessions = sqliteTable('auth_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  csrfTokenHash: text('csrf_token_hash').notNull(),
  createdAt: integer('created_at').notNull(),
  lastSeenAt: integer('last_seen_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  absoluteExpiresAt: integer('absolute_expires_at').notNull(),
  revokedAt: integer('revoked_at'),
}, t => [index('sessions_user_idx').on(t.userId), index('sessions_expiry_idx').on(t.expiresAt)]);
export type AuthSession = typeof authSessions.$inferSelect;

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at').notNull(),
}, t => [index('audit_created_idx').on(t.createdAt), index('audit_entity_idx').on(t.entityType, t.entityId)]);

// Membership storage is shared by identity and organization management.
export const departments = sqliteTable('departments', {
  id: text('id').primaryKey(), name: text('name').notNull(), slug: text('slug').notNull().unique(), description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
});
export const departmentMembers = sqliteTable('department_members', {
  departmentId: text('department_id').notNull().references(() => departments.id),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
}, t => [primaryKey({ columns: [t.departmentId, t.userId] }), index('department_members_user_idx').on(t.userId)]);
