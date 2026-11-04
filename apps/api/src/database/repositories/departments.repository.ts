import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, or, ne } from 'drizzle-orm';
import type { AdminList, DepartmentInput, DepartmentPatch } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { departments, departmentMembers, users, tickets, boards, boardMembers } from '../schema';
import { contains } from './list-query';
import { safeUser } from './users.repository';
@Injectable()
export class DepartmentsRepository {
  constructor(private readonly database: DatabaseService) {}
  get(id: string) { return this.database.db.select().from(departments).where(eq(departments.id, id)).get(); }
  catalog() { return this.database.db.select().from(departments).where(eq(departments.isActive, true)).orderBy(departments.name, departments.id).all(); }
  list(q: AdminList) {
    const where = and(q.isActive !== undefined ? eq(departments.isActive, q.isActive) : undefined,
      q.search ? or(contains(departments.name, q.search), contains(departments.slug, q.search)) : undefined);
    return { rows: this.database.db.select().from(departments).where(where).orderBy(desc(departments.createdAt), departments.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(departments).where(where).get()!.n };
  }
  create(input: DepartmentInput) { const now = Date.now(); return this.database.db.insert(departments).values({ id: randomUUID(), ...input, createdAt: now, updatedAt: now }).returning().get()!; }
  update(id: string, patch: DepartmentPatch) { return this.database.db.update(departments).set({ ...patch, updatedAt: Date.now() }).where(eq(departments.id, id)).returning().get()!; }
  membership(departmentId: string, userId: string) { return this.database.db.select().from(departmentMembers).where(and(eq(departmentMembers.departmentId, departmentId), eq(departmentMembers.userId, userId))).get(); }
  members(id: string, q: AdminList) {
    const where = and(eq(departmentMembers.departmentId, id), q.isActive !== undefined ? eq(users.isActive, q.isActive) : undefined,
      q.search ? or(contains(users.displayName, q.search), contains(users.username, q.search), contains(users.email, q.search)) : undefined);
    return { rows: this.database.db.select({ ...safeUser, joinedAt: departmentMembers.createdAt }).from(departmentMembers).innerJoin(users, eq(users.id, departmentMembers.userId)).where(where).orderBy(users.displayName, users.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(departmentMembers).innerJoin(users, eq(users.id, departmentMembers.userId)).where(where).get()!.n };
  }
  hasAssignedTickets(departmentId: string, userId: string) { return !!this.database.db.select({ id: tickets.id }).from(tickets).where(and(eq(tickets.departmentId, departmentId), eq(tickets.assignedToId, userId), ne(tickets.status, 'CLOSED'))).limit(1).get(); }
  hasBoardMembership(departmentId: string, userId: string) { return !!this.database.db.select({ id: boards.id }).from(boards).innerJoin(boardMembers, eq(boardMembers.boardId, boards.id)).where(and(eq(boards.departmentId, departmentId), eq(boardMembers.userId, userId))).limit(1).get(); }
  addMember(departmentId: string, userId: string) { this.database.db.insert(departmentMembers).values({ departmentId, userId, createdAt: Date.now() }).run(); }
  removeMember(departmentId: string, userId: string) { this.database.db.delete(departmentMembers).where(and(eq(departmentMembers.departmentId, departmentId), eq(departmentMembers.userId, userId))).run(); }
}
