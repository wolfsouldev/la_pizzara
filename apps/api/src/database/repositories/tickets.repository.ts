import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, getTableColumns, inArray, or, sql } from 'drizzle-orm';
import { publicTicketEventTypes, ticketNumber, type TicketList, type TicketCommentsQuery, type TicketCreate, type TicketStatus } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { tickets, ticketCounters, ticketCategories, departments, ticketComments, ticketEvents, users, taskTicketLinks } from '../schema';
import { contains } from './list-query';
const summary = { id: tickets.id, ticketNumber: tickets.ticketNumber, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt, updatedAt: tickets.updatedAt, department: { id: departments.id, name: departments.name }, category: { id: ticketCategories.id, name: ticketCategories.name } };
const ownership = (id: string, requesterId: string) => and(eq(tickets.id, id), eq(tickets.requesterId, requesterId));
@Injectable()
export class TicketsRepository {
  hasTaskLinks(id: string) { return !!this.database.db.select({ taskId: taskTicketLinks.taskId }).from(taskTicketLinks).where(eq(taskTicketLinks.ticketId, id)).limit(1).get(); }
  constructor(private readonly database: DatabaseService) {}
  owned(id: string, requesterId: string) {
    return this.database.db.select({ ticket: getTableColumns(tickets), department: { id: departments.id, name: departments.name }, category: { id: ticketCategories.id, name: ticketCategories.name } }).from(tickets)
      .innerJoin(departments, eq(tickets.departmentId, departments.id)).innerJoin(ticketCategories, eq(tickets.categoryId, ticketCategories.id)).where(ownership(id, requesterId)).get();
  }
  listOwned(requesterId: string, q: TicketList) {
    const number = q.search?.match(/^(?:UNI-)?0*([1-9]\d*)$/i)?.[1];
    const where = and(eq(tickets.requesterId, requesterId), q.status ? eq(tickets.status, q.status) : undefined,
      q.search ? or(contains(tickets.title, q.search), contains(tickets.description, q.search), number && Number.isSafeInteger(Number(number)) ? eq(tickets.ticketNumber, Number(number)) : undefined) : undefined);
    const rows = this.database.db.select(summary).from(tickets).innerJoin(departments, eq(tickets.departmentId, departments.id)).innerJoin(ticketCategories, eq(tickets.categoryId, ticketCategories.id))
      .where(where).orderBy(desc(tickets.createdAt), desc(tickets.ticketNumber)).limit(q.limit).offset((q.page - 1) * q.limit).all();
    return { rows: rows.map(t => ({ ...t, publicNumber: ticketNumber(t.ticketNumber) })), total: this.database.db.select({ n: count() }).from(tickets).where(where).get()!.n };
  }
  activeCategory(id: string) {
    return this.database.db.select({ id: ticketCategories.id, departmentId: ticketCategories.departmentId }).from(ticketCategories).innerJoin(departments, eq(ticketCategories.departmentId, departments.id))
      .where(and(eq(ticketCategories.id, id), eq(ticketCategories.isActive, true), eq(departments.isActive, true))).get();
  }
  create(requesterId: string, departmentId: string, input: TicketCreate, now: number) {
    // Called inside a write transaction: initialize lazily and increment in SQL,
    // never derive the next number from a client value or MAX() outside a lock.
    this.database.db.insert(ticketCounters).values({ key: 'tickets', nextValue: 1 }).onConflictDoNothing().run();
    const next = this.database.db.update(ticketCounters).set({ nextValue: sql`${ticketCounters.nextValue} + 1` }).where(eq(ticketCounters.key, 'tickets'))
      .returning({ value: sql<number>`${ticketCounters.nextValue} - 1` }).get()!;
    return this.database.db.insert(tickets).values({ id: randomUUID(), ticketNumber: next.value, requesterId, departmentId, ...input, status: 'OPEN', priority: 'NORMAL', createdAt: now, updatedAt: now }).returning().get()!;
  }
  updateOwned(id: string, requesterId: string, patch: { status?: TicketStatus; resolvedAt?: number | null; closedAt?: number | null }, now: number) {
    return this.database.db.update(tickets).set({ ...patch, updatedAt: now }).where(ownership(id, requesterId)).returning().get()!;
  }
  event(ticketId: string, actorId: string, eventType: typeof ticketEvents.$inferInsert.eventType, now: number, metadata?: Record<string, unknown>) {
    const id = randomUUID();
    this.database.db.insert(ticketEvents).values({ id, ticketId, actorId, eventType, metadata, createdAt: now }).run();
    return id;
  }
  eventPersisted(ticketId: string, eventId: string) { return !!this.database.db.select({ id: ticketEvents.id }).from(ticketEvents).where(and(eq(ticketEvents.id, eventId), eq(ticketEvents.ticketId, ticketId))).get(); }
  publicHistory(id: string, requesterId: string, q: TicketCommentsQuery) {
    const where = and(ownership(id, requesterId), inArray(ticketEvents.eventType, [...publicTicketEventTypes]));
    return { rows: this.database.db.select({ id: ticketEvents.id, eventType: ticketEvents.eventType, metadata: ticketEvents.metadata, createdAt: ticketEvents.createdAt }).from(ticketEvents).innerJoin(tickets, eq(ticketEvents.ticketId, tickets.id))
      .where(where).orderBy(desc(ticketEvents.createdAt), desc(ticketEvents.id)).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(ticketEvents).innerJoin(tickets, eq(ticketEvents.ticketId, tickets.id)).where(where).get()!.n };
  }
  publicComments(id: string, requesterId: string, q: TicketCommentsQuery) {
    const where = and(ownership(id, requesterId), eq(ticketComments.visibility, 'PUBLIC'));
    const rows = this.database.db.select({ id: ticketComments.id, body: ticketComments.body, author: { id: users.id, displayName: users.displayName }, createdAt: ticketComments.createdAt, updatedAt: ticketComments.updatedAt }).from(ticketComments).innerJoin(tickets, eq(ticketComments.ticketId, tickets.id)).innerJoin(users, eq(ticketComments.authorId, users.id))
      .where(where).orderBy(desc(ticketComments.createdAt), desc(ticketComments.id)).limit(q.limit).offset((q.page - 1) * q.limit).all();
    return { rows: rows.map(c => ({ ...c, author: { ...c.author, isRequester: c.author.id === requesterId } })), total: this.database.db.select({ n: count() }).from(ticketComments).innerJoin(tickets, eq(ticketComments.ticketId, tickets.id)).where(where).get()!.n };
  }
  addPublicComment(ticketId: string, authorId: string, body: string, now: number) {
    return this.database.db.insert(ticketComments).values({ id: randomUUID(), ticketId, authorId, body, visibility: 'PUBLIC', createdAt: now, updatedAt: now }).returning().get()!;
  }
}
