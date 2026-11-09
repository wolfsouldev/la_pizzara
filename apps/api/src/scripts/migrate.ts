import { readMigrationFiles } from 'drizzle-orm/migrator';
import { DatabaseService } from '../database/database.service';
import { resolve } from 'node:path';

const migrationsFolder = resolve(__dirname, '../../drizzle');

export function applyMigrations() {
  const database = new DatabaseService();
  try {
    const migrations = readMigrationFiles({ migrationsFolder });
    database.sqlite.exec(`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )`);
    const latest = database.sqlite.prepare('SELECT created_at FROM "__drizzle_migrations" ORDER BY created_at DESC LIMIT 1').get() as { created_at: number } | undefined;

    for (const migration of migrations) {
      if (latest && latest.created_at >= migration.folderMillis) continue;

      // Drizzle's SQLite migrator wraps all migrations in one transaction. SQLite
      // ignores PRAGMA foreign_keys=OFF inside a transaction, so a generated table
      // rebuild of a referenced table would fail. Disable it before BEGIN only for
      // that migration, then validate all references before committing.
      const rebuildsReferencedTable = migration.sql.some(statement => /PRAGMA\s+foreign_keys\s*=\s*OFF/i.test(statement));
      if (rebuildsReferencedTable) database.sqlite.pragma('foreign_keys = OFF');

      database.sqlite.exec('BEGIN');
      try {
        for (const statement of migration.sql) database.sqlite.exec(statement);
        const violations = database.sqlite.pragma('foreign_key_check') as unknown[];
        if (violations.length) throw new Error(`La migración ${migration.hash} dejó referencias de SQLite inconsistentes`);
        database.sqlite.prepare('INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (?, ?)').run(migration.hash, migration.folderMillis);
        database.sqlite.exec('COMMIT');
      } catch (error) {
        database.sqlite.exec('ROLLBACK');
        throw error;
      } finally {
        if (rebuildsReferencedTable) database.sqlite.pragma('foreign_keys = ON');
      }
    }
    console.log('Migraciones aplicadas');
  } finally { database.onModuleDestroy(); }
}
if (require.main === module) applyMigrations();
