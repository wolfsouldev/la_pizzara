import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { AdminServiceList, ServiceCreate, ServicePatch, ServiceNoteCreate, ServiceList } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { universityServices as services, serviceNotes as notes, tickets } from '../schema';
import { contains } from './list-query';
// This projection is shared by EVERY public and administrative catalog response.
// Internal notes and authors are deliberately absent, including the preview subquery.
const projection = { id: services.id, name: services.name, description: services.description, url: services.url, status: services.status, isActive: services.isActive, statusUpdatedAt: services.statusUpdatedAt, createdAt: services.createdAt, updatedAt: services.updatedAt,
  // Keep the correlated identifier qualified as static SQL: Drizzle's single-table
  // projection otherwise unqualifies interpolated columns into the inner scope.
  latestNote: sql<string | null>`(select substr(sn.body, 1, 280) from service_notes sn where sn.service_id = university_services.id and sn.visibility = 'PUBLIC' order by sn.created_at desc, sn.id desc limit 1)` };
@Injectable()
export class ServicesRepository {
  constructor(private readonly database: DatabaseService) {}
  get(id: string) { return this.database.db.select(projection).from(services).where(eq(services.id, id)).get(); }
  list(q: ServiceList | AdminServiceList, admin: boolean) {
    const publication = admin && 'publication' in q ? q.publication : 'active';
    const where = and(publication === 'all' ? undefined : eq(services.isActive, publication === 'active'), q.status ? eq(services.status, q.status) : undefined, q.search ? contains(services.name, q.search) : undefined);
    return { rows: this.database.db.select(projection).from(services).where(where).orderBy(services.name, services.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(services).where(where).get()!.n };
  }
  duplicate(name: string, except?: string) { return this.database.db.select({ id: services.id }).from(services).where(and(eq(services.nameKey, name.normalize('NFKC').toLocaleLowerCase('es')), except ? sql`${services.id} != ${except}` : undefined)).get(); }
  create(input: ServiceCreate, now: number) { const id = randomUUID(); this.database.db.insert(services).values({ id, ...input, nameKey: input.name.normalize('NFKC').toLocaleLowerCase('es'), createdAt: now, updatedAt: now, statusUpdatedAt: now }).run(); return this.get(id)!; }
  update(id: string, patch: ServicePatch, now: number, statusChanged: boolean) { this.database.db.update(services).set({ ...patch, ...(patch.name ? { nameKey: patch.name.normalize('NFKC').toLocaleLowerCase('es') } : {}), updatedAt: now, ...(statusChanged ? { statusUpdatedAt: now } : {}) }).where(eq(services.id, id)).run(); return this.get(id)!; }
  notes(id: string, q: { page: number; limit: number }, admin: boolean) {
    const where = and(eq(notes.serviceId, id), admin ? undefined : eq(notes.visibility, 'PUBLIC'));
    return { rows: this.database.db.select({ id: notes.id, body: notes.body, visibility: notes.visibility, createdAt: notes.createdAt }).from(notes).where(where).orderBy(desc(notes.createdAt), desc(notes.id)).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(notes).where(where).get()!.n };
  }
  addNote(id: string, actorId: string, input: ServiceNoteCreate, now: number) { return this.database.db.insert(notes).values({ id: randomUUID(), serviceId: id, authorId: actorId, ...input, createdAt: now }).returning({ id: notes.id, body: notes.body, visibility: notes.visibility, createdAt: notes.createdAt }).get()!; }
  deleteNote(id: string, noteId: string) { return this.database.db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.serviceId, id))).returning({ id: notes.id, visibility: notes.visibility }).get(); }
  link(ticketId: string, serviceId: string | null, now: number) { this.database.db.update(tickets).set({ serviceId, updatedAt: now }).where(eq(tickets.id, ticketId)).run(); }
}
