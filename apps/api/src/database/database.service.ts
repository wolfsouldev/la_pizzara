import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '../config/environment';
import * as schema from './schema';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly sqlite: Database.Database;
  readonly db;
  constructor() {
    const path = resolve(env.DATABASE_URL);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.sqlite = new Database(path);
    chmodSync(path, 0o600);
    this.sqlite.pragma('journal_mode = WAL');
    this.sqlite.pragma('foreign_keys = ON');
    this.sqlite.pragma('busy_timeout = 5000');
    this.db = drizzle(this.sqlite, { schema });
    if (env.NODE_ENV === 'production' && this.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get() &&
      this.db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.authProvider, 'local')).limit(1).get()) {
      this.sqlite.close();
      throw new Error('Producción no admite datos de usuarios locales; utiliza una base institucional independiente');
    }
  }
  checkConnection() { return this.db.get<{ result: number }>(sql`select 1 as result`)?.result === 1; }
  onModuleDestroy() { this.sqlite.close(); }
}
