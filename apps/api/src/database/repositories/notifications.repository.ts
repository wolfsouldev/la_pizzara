import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { UserRole, type NotificationList } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { BoardsRepository } from './boards.repository';
import { StaffTicketsRepository } from './staff-tickets.repository';
import { users, notifications, tickets, tasks, boards, type User } from '../schema';
const projection = { id:notifications.id, type:notifications.type, title:notifications.title, message:notifications.message, resourceType:notifications.resourceType, resourceId:notifications.resourceId, readAt:notifications.readAt, createdAt:notifications.createdAt, boardId:tasks.boardId };
@Injectable()
export class NotificationsRepository {
  constructor(private readonly database: DatabaseService, private readonly boardRepo: BoardsRepository, private readonly staff: StaffTicketsRepository) {}
  activeAdministratorsExcept(actorId: string) { return this.database.db.select({ id: users.id }).from(users).where(and(eq(users.role, UserRole.ADMIN), eq(users.isActive, true), ne(users.id, actorId))).all(); }
  create(input: Omit<typeof notifications.$inferInsert, 'id'>) { return this.database.db.insert(notifications).values({ id: randomUUID(), ...input }).returning().get()!; }
  persisted(id:string, userId:string) { return !!this.database.db.select({ id:notifications.id }).from(notifications).where(and(eq(notifications.id,id),eq(notifications.userId,userId))).get(); }
  private scope(user:User) {
    const owned = this.database.db.select({ id:tickets.id }).from(tickets).where(eq(tickets.requesterId,user.id));
    const staffTickets = this.database.db.select({ id:tickets.id }).from(tickets).where(this.staff.scope(user));
    const privateTasks = this.database.db.select({ id:tasks.id }).from(tasks).innerJoin(boards,eq(tasks.boardId,boards.id)).where(this.boardRepo.scope(user));
    return and(eq(notifications.userId,user.id),or(
      and(eq(notifications.resourceType,'ticket'),inArray(notifications.type,['TICKET_PUBLIC_REPLY','TICKET_STATUS_CHANGED']),inArray(notifications.resourceId,owned)),
      and(eq(notifications.resourceType,'ticket'),inArray(notifications.type,['TICKET_CREATED','TICKET_ASSIGNED']),inArray(notifications.resourceId,staffTickets)),
      and(eq(notifications.resourceType,'task'),eq(notifications.type,'TASK_ASSIGNED'),inArray(notifications.resourceId,privateTasks))
    ));
  }
  private query() { return this.database.db.select(projection).from(notifications).leftJoin(tasks,and(eq(notifications.resourceType,'task'),eq(tasks.id,notifications.resourceId))); }
  list(user:User,q:NotificationList) { const where=and(this.scope(user),q.unreadOnly?isNull(notifications.readAt):undefined);return { rows:this.query().where(where).orderBy(desc(notifications.createdAt),desc(notifications.id)).limit(q.limit).offset((q.page-1)*q.limit).all(),total:this.database.db.select({n:count()}).from(notifications).where(where).get()!.n }; }
  get(user:User,id:string) { return this.query().where(and(this.scope(user),eq(notifications.id,id))).get(); }
  unread(user:User) { return this.database.db.select({n:count()}).from(notifications).where(and(this.scope(user),isNull(notifications.readAt))).get()!.n; }
  read(user:User,id:string) { this.database.db.update(notifications).set({readAt:sql`coalesce(${notifications.readAt}, ${Date.now()})`}).where(and(this.scope(user),eq(notifications.id,id))).run(); }
  readAll(user:User) { return this.database.db.update(notifications).set({readAt:Date.now()}).where(and(this.scope(user),isNull(notifications.readAt))).run().changes; }
}
