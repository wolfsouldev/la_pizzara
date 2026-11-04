import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, or } from 'drizzle-orm';
import type { AdminList } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { auditLogs, users } from '../schema';
import { contains } from './list-query';
@Injectable()
export class AuditRepository {
  constructor(private readonly database: DatabaseService) {}
  record(actorId: string, action: string, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
    this.database.db.insert(auditLogs).values({ id: randomUUID(), actorId, action, entityType, entityId, metadata, createdAt: Date.now() }).run();
  }
  list(q: AdminList) {
    const where = and(q.search ? or(contains(auditLogs.action, q.search), contains(auditLogs.entityType, q.search), contains(users.displayName, q.search)) : undefined);
    return { rows: this.database.db.select({ id: auditLogs.id, actorId: auditLogs.actorId, actorName: users.displayName, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, metadata: auditLogs.metadata, createdAt: auditLogs.createdAt }).from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(where).orderBy(desc(auditLogs.createdAt), auditLogs.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(where).get()!.n };
  }
}
