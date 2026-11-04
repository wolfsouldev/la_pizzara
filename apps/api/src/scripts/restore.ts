import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { env } from '../config/environment';
import { restoreDatabase } from '../database/maintenance';
async function main() {
  if (process.env.UNIVERSITY_RESTORE_LOCKED !== '1') throw new Error('Restauración solo mediante entrypoint del contenedor y bloqueo exclusivo; detén primero la API');
  const { values } = parseArgs({ options: { from: { type: 'string' }, confirm: { type: 'string' } } });
  if (!values.from || values.confirm !== resolve(env.DATABASE_URL)) throw new Error('--from obligatorio y --confirm debe coincidir con la ruta absoluta de la base destino');
  const result = await restoreDatabase(values.from, env.DATABASE_URL, env.BACKUP_DIRECTORY, env.NODE_ENV === 'production');
  if (result.previous) console.log(`Copia consistente anterior: ${result.previous}`);
  console.log(`Restauración verificada: ${result.target}. Todas las sesiones revocadas; requiere nuevo login.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'No se pudo restaurar'); process.exitCode = 1; });
