import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, or, getTableColumns } from 'drizzle-orm';
import { UserRole, type UserList } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { users, authSessions, departments, departmentMembers } from '../schema';
import { contains } from './list-query';
export const safeUser = { id: users.id, username: users.username, displayName: users.displayName, email: users.email, role: users.role, isActive: users.isActive,
  authProvider: users.authProvider, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt, updatedAt: users.updatedAt };
@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}
  get(id: string) { return this.database.db.select(safeUser).from(users).where(eq(users.id, id)).get(); }
  list(q: UserList) {
    const where = and(q.role ? eq(users.role, q.role) : undefined, q.isActive !== undefined ? eq(users.isActive, q.isActive) : undefined,
      q.search ? or(contains(users.username, q.search), contains(users.displayName, q.search), contains(users.email, q.search)) : undefined);
    return { rows: this.database.db.select(safeUser).from(users).where(where).orderBy(desc(users.createdAt), users.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(users).where(where).get()!.n };
  }
  departments(id: string) { return this.database.db.select(getTableColumns(departments)).from(departments).innerJoin(departmentMembers, eq(departmentMembers.departmentId, departments.id)).where(eq(departmentMembers.userId, id)).all(); }
  activeAdmins() { return this.database.db.select({ n: count() }).from(users).where(and(eq(users.role, UserRole.ADMIN), eq(users.isActive, true))).get()!.n; }
  membershipCount(id: string) { return this.database.db.select({ n: count() }).from(departmentMembers).where(eq(departmentMembers.userId, id)).get()!.n; }
  change(id: string, patch: { role?: UserRole; isActive?: boolean }) {
    this.database.db.update(users).set({ ...patch, updatedAt: Date.now() }).where(eq(users.id, id)).run();
    this.database.db.update(authSessions).set({ revokedAt: Date.now() }).where(and(eq(authSessions.userId, id), isNull(authSessions.revokedAt))).run();
    return this.get(id)!;
  }
}
