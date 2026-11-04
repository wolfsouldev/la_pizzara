import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { DatabaseService } from '../database/database.service';
import { resolve } from 'node:path';
export function applyMigrations() {
  const database = new DatabaseService();
  try {
    migrate(database.db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
    console.log('Migraciones aplicadas');
  } finally { database.onModuleDestroy(); }
}
if (require.main === module) applyMigrations();
