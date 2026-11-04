import { parseArgs } from 'node:util';
import { env } from '../config/environment';
import { backupDatabase, backupName } from '../database/maintenance';
async function main() {
  const { values } = parseArgs({ options: { output: { type: 'string' } } });
  const output = values.output ?? backupName(env.BACKUP_DIRECTORY);
  await backupDatabase(env.DATABASE_URL, output);
  console.log(`Copia consistente verificada: ${output}`);
}
main().catch(() => { console.error('No se pudo generar la copia; comprueba origen, destino nuevo, permisos y espacio'); process.exitCode = 1; });
