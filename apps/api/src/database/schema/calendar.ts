import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { reservationStates } from '@uni/shared';
import { users } from './identity';

export const calendarRequests = sqliteTable('calendar_requests', {
  id: text('id').primaryKey(),
  requesterId: text('requester_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  purpose: text('purpose').notNull(),
  attendees: integer('attendees').notNull(),
  notes: text('notes'),
  startAt: integer('start_at').notNull(),
  endAt: integer('end_at').notNull(),
  status: text('status', { enum: reservationStates }).notNull().default('PENDING'),
  decisionNote: text('decision_note'),
  decidedAt: integer('decided_at'),
  decidedById: text('decided_by_id').references(() => users.id),
  createdAt: integer('created_at').notNull(),
}, t => [
  index('calendar_requests_owner_idx').on(t.requesterId, t.createdAt),
  index('calendar_requests_queue_idx').on(t.status, t.createdAt),
  check('calendar_request_slot', sql`${t.endAt} > ${t.startAt}`),
  check('calendar_request_attendees', sql`${t.attendees} between 1 and 10000`),
  check('calendar_request_status', sql`${t.status} in ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')`),
]);

export const calendarEvents = sqliteTable('calendar_events', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['VIDEOCONFERENCE'] }).notNull(),
  title: text('title').notNull(),
  publicDescription: text('public_description'),
  meetingLink: text('meeting_link'),
  internalNotes: text('internal_notes'),
  startAt: integer('start_at').notNull(),
  endAt: integer('end_at').notNull(),
  visibility: text('visibility', { enum: ['PRIVATE', 'PUBLIC'] }).notNull(),
  requestId: text('request_id').unique().references(() => calendarRequests.id),
  createdById: text('created_by_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  cancelledAt: integer('cancelled_at'),
}, t => [
  index('calendar_events_active_slot_idx').on(t.startAt, t.endAt).where(sql`${t.cancelledAt} is null`),
  check('calendar_event_slot', sql`${t.endAt} > ${t.startAt}`),
  check('calendar_event_type', sql`${t.type} = 'VIDEOCONFERENCE'`),
  check('calendar_event_visibility', sql`${t.visibility} in ('PRIVATE', 'PUBLIC') and (${t.requestId} is null or ${t.visibility} = 'PUBLIC')`),
]);
