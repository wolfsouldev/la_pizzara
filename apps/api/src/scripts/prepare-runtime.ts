import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { env } from '../config/environment';
import { backupDatabase, backupName } from '../database/maintenance';
import { applyMigrations } from './migrate';
async function main() {
  if (existsSync(env.DATABASE_URL)) {
    const database = new Database(env.DATABASE_URL, { readonly: true, fileMustExist: true });
    let last = 0;
    try {
      if (database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'").get()) {
        last = (database.prepare('SELECT coalesce(max(created_at), 0) AS last FROM __drizzle_migrations').get() as { last: number }).last;
      }
    } finally { database.close(); }
    const latest = readMigrationFiles({ migrationsFolder: resolve(__dirname, '../../drizzle') }).at(-1)?.folderMillis ?? 0;
    if (latest > last) console.log(`Respaldo previo a migración: ${await backupDatabase(env.DATABASE_URL, backupName(env.BACKUP_DIRECTORY, 'before-migration'))}`);
  }
  applyMigrations();
}
main().catch(() => { console.error('Preparación fallida; no se inició la API. Revisa permisos, copia previa y migraciones'); process.exitCode = 1; });
