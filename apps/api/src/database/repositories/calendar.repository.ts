import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, isNull, lt, ne } from 'drizzle-orm';
import type { CalendarRange, CalendarRequestList } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { calendarEvents as events, calendarRequests as requests, users } from '../schema';

const publicFields = { id: events.id, type: events.type, title: events.title, publicDescription: events.publicDescription, startAt: events.startAt, endAt: events.endAt };
const adminFields = { ...publicFields, visibility: events.visibility, internalNotes: events.internalNotes, requestId: events.requestId, cancelledAt: events.cancelledAt };
const requestFields = { id: requests.id, title: requests.title, startAt: requests.startAt, endAt: requests.endAt, purpose: requests.purpose, attendees: requests.attendees, notes: requests.notes, status: requests.status, decisionNote: requests.decisionNote, decidedAt: requests.decidedAt, createdAt: requests.createdAt, event: { id: events.id, startAt: events.startAt, endAt: events.endAt, cancelledAt: events.cancelledAt } };
const reviewFields = { ...requestFields, requester: { id: users.id, displayName: users.displayName } };

@Injectable()
export class CalendarRepository {
  constructor(private readonly database: DatabaseService) {}
  private range({ from, to }: CalendarRange) { return and(isNull(events.cancelledAt), lt(events.startAt, to), gt(events.endAt, from)); }
  publicEvents(range: CalendarRange) { return this.database.db.select(publicFields).from(events).where(and(this.range(range), eq(events.visibility, 'PUBLIC'))).orderBy(events.startAt, events.id).all(); }
  adminEvents(range: CalendarRange) { return this.database.db.select(adminFields).from(events).where(this.range(range)).orderBy(events.startAt, events.id).all(); }
  overlaps(startAt: number, endAt: number, except?: string) {
    return !!this.database.db.select({ id: events.id }).from(events).where(and(this.range({ from: startAt, to: endAt }), except ? ne(events.id, except) : undefined)).limit(1).get();
  }
  event(id: string) { return this.database.db.select(adminFields).from(events).where(eq(events.id, id)).get(); }
  insertEvent(data: typeof events.$inferInsert) { return this.database.db.insert(events).values(data).returning(adminFields).get()!; }
  updateEvent(id: string, data: Partial<typeof events.$inferInsert>) { return this.database.db.update(events).set(data).where(eq(events.id, id)).returning(adminFields).get()!; }

  request(id: string, owner?: string) {
    return this.database.db.select().from(requests).where(and(eq(requests.id, id), owner ? eq(requests.requesterId, owner) : undefined)).get();
  }
  insertRequest(data: typeof requests.$inferInsert) { this.database.db.insert(requests).values(data).run(); }
  decide(id: string, data: Pick<typeof requests.$inferInsert, 'status' | 'decidedById' | 'decidedAt' | 'decisionNote'>) { this.database.db.update(requests).set(data).where(eq(requests.id, id)).run(); }
  ownRequest(id: string, owner: string) {
    return this.database.db.select(requestFields).from(requests).leftJoin(events, eq(events.requestId, requests.id)).where(and(eq(requests.id, id), eq(requests.requesterId, owner))).get();
  }
  review(id: string) {
    return this.database.db.select(reviewFields).from(requests).leftJoin(events, eq(events.requestId, requests.id)).innerJoin(users, eq(users.id, requests.requesterId)).where(eq(requests.id, id)).get();
  }
  ownRequests(owner: string, q: CalendarRequestList) {
    const where = and(eq(requests.requesterId, owner), q.status ? eq(requests.status, q.status) : undefined);
    return { rows: this.database.db.select(requestFields).from(requests).leftJoin(events, eq(events.requestId, requests.id)).where(where).orderBy(desc(requests.createdAt), requests.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(requests).where(where).get()!.n };
  }
  reviewRequests(q: CalendarRequestList) {
    const where = q.status ? eq(requests.status, q.status) : undefined;
    return { rows: this.database.db.select(reviewFields).from(requests).leftJoin(events, eq(events.requestId, requests.id)).innerJoin(users, eq(users.id, requests.requesterId)).where(where).orderBy(desc(requests.createdAt), requests.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(requests).where(where).get()!.n };
  }
}
