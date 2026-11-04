import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, getTableColumns, inArray, isNull, notInArray, or, sql } from 'drizzle-orm';
import { UserRole, type BoardCreate, type BoardPatch, type BoardList, type KanbanPage, type BoardCandidateQuery, type BoardPermission, type ColumnCreate, type ColumnPatch } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { boards, boardMembers, boardColumns, departments, departmentMembers, users, tasks, taskAssignees, type User } from '../schema';
import { contains } from './list-query';
@Injectable()
export class BoardsRepository {
  constructor(private readonly database: DatabaseService) {}
  scope(user: User) {
    if (user.role === UserRole.ADMIN) return undefined;
    if (user.role !== UserRole.TECHNICIAN || !user.isActive) return sql`0 = 1`;
    return and(inArray(boards.id, this.database.db.select({ id: boardMembers.boardId }).from(boardMembers).where(eq(boardMembers.userId, user.id))), inArray(boards.departmentId, this.database.db.select({ id: departmentMembers.departmentId }).from(departmentMembers).where(eq(departmentMembers.userId, user.id))));
  }
  get(user: User, id: string) { return this.database.db.select({ board: getTableColumns(boards), departmentName: departments.name, permission: boardMembers.permission }).from(boards).innerJoin(departments, eq(boards.departmentId, departments.id)).leftJoin(boardMembers, and(eq(boardMembers.boardId, boards.id), eq(boardMembers.userId, user.id))).where(and(eq(boards.id, id), this.scope(user))).get(); }
  list(user: User, q: BoardList) {
    const where = and(this.scope(user), eq(boards.isArchived, q.isArchived), q.departmentId ? eq(boards.departmentId, q.departmentId) : undefined, q.search ? or(contains(boards.name, q.search), contains(boards.description, q.search)) : undefined);
    const rows = this.database.db.select({ ...getTableColumns(boards), departmentName: departments.name, permission: boardMembers.permission }).from(boards).innerJoin(departments, eq(boards.departmentId, departments.id)).leftJoin(boardMembers, and(eq(boardMembers.boardId, boards.id), eq(boardMembers.userId, user.id))).where(where).orderBy(desc(boards.updatedAt), boards.id).limit(q.limit).offset((q.page - 1) * q.limit).all();
    return { rows: rows.map(b => ({ ...b, permission: user.role === UserRole.ADMIN ? 'MANAGE' as const : b.permission! })), total: this.database.db.select({ n: count() }).from(boards).where(where).get()!.n };
  }
  activeDepartment(id: string) { return this.database.db.select({ id: departments.id }).from(departments).where(and(eq(departments.id, id), eq(departments.isActive, true))).get(); }
  create(userId: string, input: BoardCreate, now: number) { return this.database.db.insert(boards).values({ id: randomUUID(), ...input, createdById: userId, createdAt: now, updatedAt: now }).returning().get()!; }
  update(id: string, patch: BoardPatch & { isArchived?: boolean }, now: number) { return this.database.db.update(boards).set({ ...patch, updatedAt: now }).where(eq(boards.id, id)).returning().get()!; }
  columns(boardId: string) { return this.database.db.select().from(boardColumns).where(eq(boardColumns.boardId, boardId)).orderBy(boardColumns.position, boardColumns.id).all(); }
  column(boardId: string, id: string) { return this.database.db.select().from(boardColumns).where(and(eq(boardColumns.boardId, boardId), eq(boardColumns.id, id))).get(); }
  addColumn(boardId: string, input: ColumnCreate, position: number, now: number) { return this.database.db.insert(boardColumns).values({ id: randomUUID(), boardId, ...input, position, createdAt: now, updatedAt: now }).returning().get()!; }
  updateColumn(boardId: string, id: string, input: ColumnPatch & { position?: number }, now: number) { return this.database.db.update(boardColumns).set({ ...input, updatedAt: now }).where(and(eq(boardColumns.boardId, boardId), eq(boardColumns.id, id))).returning().get()!; }
  hasTasks(boardId: string, columnId: string) { return !!this.database.db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.boardId, boardId), eq(tasks.columnId, columnId))).limit(1).get(); }
  deleteColumn(boardId: string, id: string) { this.database.db.delete(boardColumns).where(and(eq(boardColumns.boardId, boardId), eq(boardColumns.id, id))).run(); }
  membership(boardId: string, userId: string) { return this.database.db.select().from(boardMembers).where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId))).get(); }
  private eligibleCondition(departmentId: string) { return and(eq(users.isActive, true), or(eq(users.role, UserRole.ADMIN), and(eq(users.role, UserRole.TECHNICIAN), inArray(users.id, this.database.db.select({ id: departmentMembers.userId }).from(departmentMembers).where(eq(departmentMembers.departmentId, departmentId)))))); }
  eligibleUser(departmentId: string, userId: string) { return this.database.db.select({ id: users.id, role: users.role }).from(users).where(and(eq(users.id, userId), this.eligibleCondition(departmentId))).get(); }
  members(boardId: string, departmentId: string, q: KanbanPage) {
    const where = eq(boardMembers.boardId, boardId);
    return { rows: this.database.db.select({ boardId: boardMembers.boardId, userId: boardMembers.userId, permission: boardMembers.permission, createdAt: boardMembers.createdAt, displayName: users.displayName, username: users.username, isActive: users.isActive, eligible: sql<boolean>`case when ${this.eligibleCondition(departmentId)} then 1 else 0 end`.mapWith(Boolean) }).from(boardMembers).innerJoin(users, eq(boardMembers.userId, users.id)).where(where).orderBy(users.displayName, users.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(boardMembers).where(where).get()!.n };
  }
  candidates(boardId: string, departmentId: string, q: BoardCandidateQuery) {
    const where = and(this.eligibleCondition(departmentId), notInArray(users.id, this.database.db.select({ id: boardMembers.userId }).from(boardMembers).where(eq(boardMembers.boardId, boardId))), q.search ? or(contains(users.displayName, q.search), contains(users.username, q.search)) : undefined);
    return { rows: this.database.db.select({ id: users.id, displayName: users.displayName, username: users.username, role: users.role }).from(users).where(where).orderBy(users.displayName, users.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(users).where(where).get()!.n };
  }
  addMember(boardId: string, userId: string, permission: BoardPermission, now: number) { this.database.db.insert(boardMembers).values({ boardId, userId, permission, createdAt: now }).run(); }
  permission(boardId: string, userId: string, permission: BoardPermission) { this.database.db.update(boardMembers).set({ permission }).where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId))).run(); }
  removeMember(boardId: string, userId: string) { this.database.db.delete(boardMembers).where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId))).run(); }
  activeAssignments(boardId: string, userId: string) { return this.database.db.select({ taskId: tasks.id }).from(tasks).innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId)).where(and(eq(tasks.boardId, boardId), isNull(tasks.archivedAt), eq(taskAssignees.userId, userId))).all(); }
  removeAssignment(taskId: string, userId: string) { this.database.db.delete(taskAssignees).where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId))).run(); }
}
