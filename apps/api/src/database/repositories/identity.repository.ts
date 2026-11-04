import { Injectable } from '@nestjs/common';
import { and, count, eq, gt, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { UserRole } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { users, localCredentials, authSessions, auditLogs, departments, departmentMembers } from '../schema';
import type { AuthenticatedIdentity } from '../../modules/auth/providers/identity-provider';

@Injectable()
export class IdentityRepository {
  constructor(private readonly database: DatabaseService) {}

  localIdentity(username: string) {
    return this.database.db.select({ user: users, credentials: localCredentials }).from(users)
      .innerJoin(localCredentials, eq(users.id, localCredentials.userId))
      .where(and(eq(users.authProvider, 'local'), eq(users.usernameNormalized, username.toLowerCase()))).get();
  }
  byUsername(provider: 'local' | 'ldap', username: string) {
    return this.database.db.select().from(users).where(and(eq(users.authProvider, provider), eq(users.usernameNormalized, username.toLowerCase()))).all();
  }
  hasLocalUsers() { return this.database.db.select({ total: count() }).from(users).where(eq(users.authProvider, 'local')).get()!.total > 0; }
  departments(userId: string) {
    return this.database.db.select({ id: departments.id, name: departments.name }).from(departments)
      .innerJoin(departmentMembers, eq(departmentMembers.departmentId, departments.id))
      .where(and(eq(departmentMembers.userId, userId), eq(departments.isActive, true))).all();
  }

  sync(identity: AuthenticatedIdentity) {
    const now = Date.now();
    return this.database.db.transaction(tx => {
      const existing = tx.select().from(users).where(and(eq(users.authProvider, identity.provider),
        identity.provider === 'local' ? eq(users.id, identity.externalId) : eq(users.externalId, identity.externalId))).get();
      if (existing && !existing.isActive) return;
      const profile = { username: identity.username, usernameNormalized: identity.username.toLowerCase(), displayName: identity.displayName,
        email: identity.email, adDepartment: identity.department, lastLoginAt: now, directoryCheckedAt: identity.provider === 'ldap' ? now : null, updatedAt: now };
      if (existing) return tx.update(users).set(profile).where(eq(users.id, existing.id)).returning().get();
      if (identity.provider === 'local') return;
      // Match AD accounts exclusively by GUID. A conflicting username must not
      // transfer roles/memberships from a different GUID; UNIQUE rejects it.
      return tx.insert(users).values({ id: randomUUID(), authProvider: 'ldap', externalId: identity.externalId, createdAt: now, ...profile }).returning().get();
    });
  }

  session(tokenHash: string) {
    const now = Date.now();
    return this.database.db.select({ session: authSessions, user: users }).from(authSessions).innerJoin(users, eq(authSessions.userId, users.id))
      .where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, now), gt(authSessions.absoluteExpiresAt, now), eq(users.isActive, true))).get();
  }
  createSession(value: typeof authSessions.$inferInsert, previousHash: string | undefined, mode: 'credentials' | 'development') {
    return this.database.db.transaction(tx => {
      const active = tx.select().from(users).where(and(eq(users.id, value.userId), eq(users.isActive, true))).get();
      if (!active) return false;
      if (previousHash) tx.update(authSessions).set({ revokedAt: Date.now() }).where(eq(authSessions.tokenHash, previousHash)).run();
      tx.insert(authSessions).values(value).run();
      tx.insert(auditLogs).values({ id: randomUUID(), actorId: value.userId, action: mode === 'development' ? 'DEVELOPMENT_ACCESS_LOGIN' : 'LOGIN', entityType: 'user', entityId: value.userId, metadata: { provider: active.authProvider }, createdAt: Date.now() }).run();
      return true;
    });
  }
  touch(id: string, expiresAt: number) {
    this.database.db.update(authSessions).set({ lastSeenAt: Date.now(), expiresAt }).where(and(eq(authSessions.id, id), isNull(authSessions.revokedAt))).run();
  }
  revoke(tokenHash: string) {
    this.database.db.transaction(tx => {
      const session = tx.update(authSessions).set({ revokedAt: Date.now() }).where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt))).returning().get();
      if (session) tx.insert(auditLogs).values({ id: randomUUID(), actorId: session.userId, action: 'LOGOUT', entityType: 'user', entityId: session.userId, createdAt: Date.now() }).run();
    });
  }
  directoryChecked(userId: string) { this.database.db.update(users).set({ directoryCheckedAt: Date.now() }).where(eq(users.id, userId)).run(); }
  revokeUser(userId: string) {
    this.database.db.update(authSessions).set({ revokedAt: Date.now() }).where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt))).run();
  }
  createLocal(input: { username: string; displayName: string; email: string | null }, passwordHash: string) {
    const id = randomUUID(); const now = Date.now();
    return this.database.db.transaction(tx => {
      const user = tx.insert(users).values({ id, authProvider: 'local', username: input.username, usernameNormalized: input.username.toLowerCase(), displayName: input.displayName, email: input.email, createdAt: now, updatedAt: now }).returning().get();
      tx.insert(localCredentials).values({ userId: id, passwordHash, createdAt: now, updatedAt: now }).run();
      tx.insert(auditLogs).values({ id: randomUUID(), action: 'LOCAL_USER_CREATED_CLI', entityType: 'user', entityId: id, createdAt: now }).run();
      return user;
    });
  }
  promoteAdmin(id: string, expectedUsername: string, provider: 'local' | 'ldap') {
    return this.database.db.transaction(tx => {
      const user = tx.select().from(users).where(and(eq(users.id, id), eq(users.username, expectedUsername), eq(users.authProvider, provider), eq(users.isActive, true))).get();
      if (!user?.lastLoginAt) return false;
      const now = Date.now();
      tx.update(users).set({ role: UserRole.ADMIN, updatedAt: now }).where(eq(users.id, id)).run();
      tx.update(authSessions).set({ revokedAt: now }).where(eq(authSessions.userId, id)).run();
      tx.insert(auditLogs).values({ id: randomUUID(), action: 'ADMIN_PROMOTED_CLI', entityType: 'user', entityId: id, metadata: { previousRole: user.role, role: UserRole.ADMIN }, createdAt: now }).run();
      return true;
    });
  }
}
