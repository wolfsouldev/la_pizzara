import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, getTableColumns } from 'drizzle-orm';
import type { KanbanPage } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { BoardsRepository } from './boards.repository';
import { StaffTicketsRepository } from './staff-tickets.repository';
import { taskTicketLinks, tasks, tickets, boards, boardColumns, boardMembers, type User } from '../schema';
@Injectable()
export class TaskLinksRepository {
  constructor(private readonly database: DatabaseService, private readonly boardsRepo: BoardsRepository, private readonly staff: StaffTicketsRepository) {}
  private scope(user: User) { return and(this.boardsRepo.scope(user), this.staff.scope(user), eq(boards.departmentId, tickets.departmentId)); }
  private joined() { return this.database.db.select({ ...getTableColumns(taskTicketLinks), title: tickets.title, ticketNumber: tickets.ticketNumber, status: tickets.status, priority: tickets.priority, assignedToId: tickets.assignedToId }).from(taskTicketLinks).innerJoin(tasks, eq(tasks.id, taskTicketLinks.taskId)).innerJoin(boards, eq(boards.id, tasks.boardId)).innerJoin(tickets, eq(tickets.id, taskTicketLinks.ticketId)); }
  tickets(user: User, taskId: string, q: KanbanPage) {
    const where = and(this.scope(user), eq(tasks.id, taskId));
    return { rows: this.joined().where(where).orderBy(desc(taskTicketLinks.createdAt), tickets.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(taskTicketLinks).innerJoin(tasks, eq(tasks.id, taskTicketLinks.taskId)).innerJoin(boards, eq(boards.id, tasks.boardId)).innerJoin(tickets, eq(tickets.id, taskTicketLinks.ticketId)).where(where).get()!.n };
  }
  tasks(user: User, ticketId: string, q: KanbanPage) {
    const where = and(this.scope(user), eq(tickets.id, ticketId));
    const rows = this.database.db.select({ taskId: tasks.id, boardId: boards.id, boardName: boards.name, columnName: boardColumns.name, title: tasks.title, priority: tasks.priority, archivedAt: tasks.archivedAt, boardArchived: boards.isArchived, createdById: taskTicketLinks.createdById, createdAt: taskTicketLinks.createdAt, permission: boardMembers.permission }).from(taskTicketLinks).innerJoin(tasks, eq(tasks.id, taskTicketLinks.taskId)).innerJoin(boards, eq(boards.id, tasks.boardId)).innerJoin(boardColumns, eq(boardColumns.id, tasks.columnId)).innerJoin(tickets, eq(tickets.id, taskTicketLinks.ticketId)).leftJoin(boardMembers, and(eq(boardMembers.boardId, boards.id), eq(boardMembers.userId, user.id))).where(where).orderBy(desc(taskTicketLinks.createdAt), tasks.id).limit(q.limit).offset((q.page - 1) * q.limit).all();
    const total = this.database.db.select({ n: count() }).from(taskTicketLinks).innerJoin(tasks, eq(tasks.id, taskTicketLinks.taskId)).innerJoin(boards, eq(boards.id, tasks.boardId)).innerJoin(tickets, eq(tickets.id, taskTicketLinks.ticketId)).where(where).get()!.n;
    return { rows, total };
  }
  get(taskId: string, ticketId: string) { return this.database.db.select().from(taskTicketLinks).where(and(eq(taskTicketLinks.taskId, taskId), eq(taskTicketLinks.ticketId, ticketId))).get(); }
  add(taskId: string, ticketId: string, userId: string, now: number) { return this.database.db.insert(taskTicketLinks).values({ taskId, ticketId, createdById: userId, createdAt: now }).returning().get()!; }
  remove(taskId: string, ticketId: string) { this.database.db.delete(taskTicketLinks).where(and(eq(taskTicketLinks.taskId, taskId), eq(taskTicketLinks.ticketId, ticketId))).run(); }
}
