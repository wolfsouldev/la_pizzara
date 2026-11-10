import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, getTableColumns, inArray, isNull, isNotNull, or, sql } from 'drizzle-orm';
import { alias, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { UserRole, ticketNumber, type StaffTicketList, type TicketCommentsQuery } from '@uni/shared';
import { BoardsRepository } from './boards.repository';
import { DatabaseService } from '../database.service';
import { departments, departmentMembers, ticketCategories, tickets, ticketComments, ticketEvents, users, tasks, boards, boardColumns, taskAssignees, type User, type Ticket } from '../schema';
import { contains } from './list-query';
const requester = alias(users, 'requester');
const assignee = alias(users, 'assignee');
function person<T extends { id: AnySQLiteColumn; displayName: AnySQLiteColumn; username: AnySQLiteColumn }>(u: T): Pick<T, 'id' | 'displayName' | 'username'> { return { id: u.id, displayName: u.displayName, username: u.username }; }
@Injectable()
export class StaffTicketsRepository {
  constructor(private readonly database: DatabaseService, private readonly boardRepo: BoardsRepository) {}
  scope(user: User) {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) return undefined;
    if (user.role !== 'TECHNICIAN') return sql`0 = 1`;
    return inArray(tickets.departmentId, this.database.db.select({ id: departmentMembers.departmentId }).from(departmentMembers).where(eq(departmentMembers.userId, user.id)));
  }
  private scopedDepartments(user: User) {
    return user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN ? undefined : user.role === UserRole.TECHNICIAN ? inArray(departments.id, this.database.db.select({ id: departmentMembers.departmentId }).from(departmentMembers).where(eq(departmentMembers.userId, user.id))) : sql`0 = 1`;
  }
  get(user: User, id: string) {
    return this.database.db.select({ ticket: getTableColumns(tickets), department: { id: departments.id, name: departments.name }, category: { id: ticketCategories.id, name: ticketCategories.name }, requester: person(requester), assignee: person(assignee) }).from(tickets)
      .innerJoin(departments, eq(tickets.departmentId, departments.id)).innerJoin(ticketCategories, eq(tickets.categoryId, ticketCategories.id)).innerJoin(requester, eq(tickets.requesterId, requester.id)).leftJoin(assignee, eq(tickets.assignedToId, assignee.id)).where(and(eq(tickets.id, id), this.scope(user))).get();
  }
  list(user: User, q: StaffTicketList) {
    const number = q.search?.match(/^(?:UNI-)?0*([1-9]\d*)$/i)?.[1];
    const where = and(this.scope(user), q.departmentId ? eq(tickets.departmentId, q.departmentId) : undefined, q.categoryId ? eq(tickets.categoryId, q.categoryId) : undefined, q.priority ? eq(tickets.priority, q.priority) : undefined, q.status ? eq(tickets.status, q.status) : undefined,
      q.assignedToId ? eq(tickets.assignedToId, q.assignedToId) : undefined, q.unassigned === true ? isNull(tickets.assignedToId) : q.unassigned === false ? isNotNull(tickets.assignedToId) : undefined,
      q.search ? or(contains(tickets.title, q.search), contains(tickets.description, q.search), number && Number.isSafeInteger(Number(number)) ? eq(tickets.ticketNumber, Number(number)) : undefined) : undefined);
    const rows = this.database.db.select({ id: tickets.id, ticketNumber: tickets.ticketNumber, title: tickets.title, priority: tickets.priority, status: tickets.status, createdAt: tickets.createdAt, updatedAt: tickets.updatedAt, department: { id: departments.id, name: departments.name }, category: { id: ticketCategories.id, name: ticketCategories.name }, requester: person(requester), assignee: person(assignee) }).from(tickets)
      .innerJoin(departments, eq(tickets.departmentId, departments.id)).innerJoin(ticketCategories, eq(tickets.categoryId, ticketCategories.id)).innerJoin(requester, eq(tickets.requesterId, requester.id)).leftJoin(assignee, eq(tickets.assignedToId, assignee.id)).where(where).orderBy(desc(tickets.updatedAt), desc(tickets.ticketNumber)).limit(q.limit).offset((q.page - 1) * q.limit).all();
    return { rows: rows.map(t => ({ ...t, publicNumber: ticketNumber(t.ticketNumber) })), total: this.database.db.select({ n: count() }).from(tickets).where(where).get()!.n };
  }
  options(user: User) {
    const where = this.scopedDepartments(user);
    const scopedDepartments = this.database.db.select({ id: departments.id }).from(departments).where(where).all();
    const technicians = this.database.db.select({ ...person(users), departmentId: departmentMembers.departmentId, isActive: users.isActive }).from(departmentMembers).innerJoin(departments, eq(departments.id, departmentMembers.departmentId)).innerJoin(users, eq(users.id, departmentMembers.userId)).where(and(where, eq(users.role, UserRole.TECHNICIAN))).all();
    // Institutional ADMINs may be assigned across departments without being
    // department technicians; repeat each eligible admin per scoped department
    // to preserve the existing options DTO and its department filtering.
    const admins = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN
      ? this.database.db.select({ ...person(users), isActive: users.isActive }).from(users).where(eq(users.role, UserRole.ADMIN)).all()
      : [];
    return {
      departments: this.database.db.select({ id: departments.id, name: departments.name, isActive: departments.isActive }).from(departments).where(where).orderBy(departments.name).all(),
      categories: this.database.db.select({ id: ticketCategories.id, name: ticketCategories.name, departmentId: ticketCategories.departmentId, isActive: ticketCategories.isActive }).from(ticketCategories).innerJoin(departments, eq(ticketCategories.departmentId, departments.id)).where(where).orderBy(ticketCategories.name).all(),
      assignees: [...technicians, ...admins.flatMap(admin => scopedDepartments.map(department => ({ ...admin, departmentId: department.id })))].sort((a, b) => a.displayName.localeCompare(b.displayName, 'es')),
    };
  }
  eligibleAssignee(userId: string, departmentId: string) {
    return this.database.db.select({ id: users.id }).from(users).where(and(eq(users.id, userId), eq(users.isActive, true), or(eq(users.role, UserRole.ADMIN), and(eq(users.role, UserRole.TECHNICIAN), inArray(users.id, this.database.db.select({ id: departmentMembers.userId }).from(departmentMembers).where(eq(departmentMembers.departmentId, departmentId))))))).get();
  }
  category(id: string, departmentId: string) { return this.database.db.select({ id: ticketCategories.id }).from(ticketCategories).innerJoin(departments, eq(departments.id, ticketCategories.departmentId)).where(and(eq(ticketCategories.id, id), eq(ticketCategories.departmentId, departmentId), eq(ticketCategories.isActive, true), eq(departments.isActive, true))).get(); }
  update(user: User, id: string, patch: Partial<Pick<Ticket, 'status' | 'priority' | 'assignedToId' | 'departmentId' | 'categoryId' | 'assignedAt' | 'resolvedAt' | 'closedAt'>>, now: number) {
    return this.database.db.update(tickets).set({ ...patch, updatedAt: now }).where(and(eq(tickets.id, id), this.scope(user))).returning().get()!;
  }
  comments(user: User, id: string, q: TicketCommentsQuery) {
    const where = and(eq(tickets.id, id), this.scope(user));
    return { rows: this.database.db.select({ id: ticketComments.id, body: ticketComments.body, visibility: ticketComments.visibility, author: { id: users.id, displayName: users.displayName }, createdAt: ticketComments.createdAt, updatedAt: ticketComments.updatedAt }).from(ticketComments).innerJoin(tickets, eq(tickets.id, ticketComments.ticketId)).innerJoin(users, eq(users.id, ticketComments.authorId)).where(where).orderBy(desc(ticketComments.createdAt), desc(ticketComments.id)).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(ticketComments).innerJoin(tickets, eq(tickets.id, ticketComments.ticketId)).where(where).get()!.n };
  }
  addComment(ticketId: string, authorId: string, body: string, visibility: 'PUBLIC' | 'INTERNAL', now: number) {
    return this.database.db.insert(ticketComments).values({ id: randomUUID(), ticketId, authorId, body, visibility, createdAt: now, updatedAt: now }).returning().get()!;
  }
  events(user: User, id: string, q: TicketCommentsQuery) {
    const where = and(eq(tickets.id, id), this.scope(user));
    return { rows: this.database.db.select({ id: ticketEvents.id, eventType: ticketEvents.eventType, actor: { id: users.id, displayName: users.displayName }, metadata: ticketEvents.metadata, createdAt: ticketEvents.createdAt }).from(ticketEvents).innerJoin(tickets, eq(tickets.id, ticketEvents.ticketId)).leftJoin(users, eq(users.id, ticketEvents.actorId)).where(where).orderBy(desc(ticketEvents.createdAt), desc(ticketEvents.id)).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(ticketEvents).innerJoin(tickets, eq(tickets.id, ticketEvents.ticketId)).where(where).get()!.n };
  }
  dashboard(user: User) {
    const statuses = this.database.db.select({ status: tickets.status, n: count() }).from(tickets).where(this.scope(user)).groupBy(tickets.status).all();
    const n = (status: Ticket['status']) => statuses.find(r => r.status === status)?.n ?? 0;
    return { myPendingTasks:this.database.db.select({n:count()}).from(tasks).innerJoin(boards,eq(tasks.boardId,boards.id)).innerJoin(boardColumns,eq(tasks.columnId,boardColumns.id)).innerJoin(taskAssignees,eq(tasks.id,taskAssignees.taskId)).where(and(this.boardRepo.scope(user),eq(taskAssignees.userId,user.id),isNull(tasks.archivedAt),eq(boards.isArchived,false),eq(boardColumns.isDone,false))).get()!.n, totalTickets: statuses.reduce((sum, row) => sum + row.n, 0), openTickets: n('OPEN'), assignedTickets: n('ASSIGNED'), inProgressTickets: n('IN_PROGRESS'), waitingUserTickets: n('WAITING_USER'), resolvedTickets: n('RESOLVED'), closedTickets: n('CLOSED'),
      unassignedTickets: this.database.db.select({ n: count() }).from(tickets).where(and(this.scope(user), isNull(tickets.assignedToId), sql`${tickets.status} not in ('RESOLVED','CLOSED')`)).get()!.n,
      myAssignedTickets: this.database.db.select({ n: count() }).from(tickets).where(and(this.scope(user), eq(tickets.assignedToId, user.id), sql`${tickets.status} not in ('RESOLVED','CLOSED')`)).get()!.n,
      ticketsByDepartment: this.database.db.select({ departmentId: departments.id, name: departments.name, count: count() }).from(tickets).innerJoin(departments, eq(tickets.departmentId, departments.id)).where(this.scope(user)).groupBy(departments.id, departments.name).orderBy(departments.name).all(),
      ticketsByPriority: this.database.db.select({ priority: tickets.priority, count: count() }).from(tickets).where(this.scope(user)).groupBy(tickets.priority).all(),
    };
  }
}
