import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { closeSync, chmodSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, realpathSync, renameSync, unlinkSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { authSessions, auditLogs, users } from './schema';

export function assertSnapshot(database: Database.Database, institutional = false) {
  if (database.pragma('integrity_check', { simple: true }) !== 'ok' || (database.pragma('foreign_key_check') as unknown[]).length) throw new Error('La copia no supera integridad y claves foráneas');
  if (!database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()) throw new Error('No es una base de la plataforma migrada');
  if (institutional && drizzle(database).select({ id: users.id }).from(users).where(eq(users.authProvider, 'local')).limit(1).get()) throw new Error('No se restauran identidades locales en producción');
}
export function backupName(directory: string, prefix = 'university') {
  return join(resolve(directory), `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.sqlite`);
}
function privateTemporary(directory: string) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, `.university-${randomUUID()}.partial`);
  closeSync(openSync(file, 'wx', 0o600));
  return file;
}
function syncFile(file: string) { const fd = openSync(file, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } }
export async function backupDatabase(source: string, destination: string) {
  source = resolve(source); destination = resolve(destination);
  if (!lstatSync(source).isFile() || lstatSync(source).isSymbolicLink()) throw new Error('Origen inexistente, no regular o simbólico');
  if (source === destination || existsSync(destination)) throw new Error('La copia no puede reemplazar un archivo existente');
  const temporary = privateTemporary(dirname(destination));
  const database = new Database(source, { readonly: true, fileMustExist: true });
  try {
    database.pragma('busy_timeout = 5000');
    await database.backup(temporary);
    const copy = new Database(temporary, { readonly: true, fileMustExist: true });
    try { assertSnapshot(copy); } finally { copy.close(); }
    chmodSync(temporary, 0o600); syncFile(temporary);
    // Atomic publication without overwriting a concurrent existing destination.
    linkSync(temporary, destination); syncFile(dirname(destination));
    return destination;
  } finally { database.close(); unlinkSync(temporary); }
}
export async function restoreDatabase(source: string, target: string, backupDirectory: string, institutional: boolean) {
  source = realpathSync(source); target = resolve(target);
  if (source === target || !lstatSync(source).isFile()) throw new Error('Origen de restauración no válido');
  if (existsSync(target) && (!lstatSync(target).isFile() || lstatSync(target).isSymbolicLink())) throw new Error('Destino no regular o simbólico');
  const temporary = privateTemporary(dirname(target));
  const snapshot = new Database(source, { readonly: true, fileMustExist: true });
  let previous: string | undefined;
  try {
    assertSnapshot(snapshot, institutional);
    await snapshot.backup(temporary);
    const restored = new Database(temporary);
    try {
      restored.pragma('foreign_keys = ON');
      const db = drizzle(restored);
      db.transaction(tx => {
        const now = Date.now();
        tx.update(authSessions).set({ revokedAt: now }).where(isNull(authSessions.revokedAt)).run();
        tx.insert(auditLogs).values({ id: randomUUID(), actorId: null, action: 'DATABASE_RESTORED', entityType: 'system', metadata: { sessionsRevoked: true }, createdAt: now }).run();
      });
      assertSnapshot(restored, institutional);
    } finally { restored.close(); }
    chmodSync(temporary, 0o600); syncFile(temporary);
    if (existsSync(target)) previous = await backupDatabase(target, backupName(backupDirectory, 'before-restore'));
    // Caller holds the same kernel lock as the API, with all old connections closed.
    for (const suffix of ['-wal', '-shm']) if (existsSync(target + suffix)) unlinkSync(target + suffix);
    renameSync(temporary, target); syncFile(dirname(target));
    return { previous, target: basename(target) };
  } finally { snapshot.close(); if (existsSync(temporary)) unlinkSync(temporary); }
}
