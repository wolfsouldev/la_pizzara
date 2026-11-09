import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const expected = readFileSync(new URL('../.node-version', import.meta.url), 'utf8').trim();
const minimum = expected.split('.').map(Number);
const current = process.versions.node.split('.').map(Number);
const older = current[1] < minimum[1] || (current[1] === minimum[1] && current[2] < minimum[2]);
if (current[0] !== minimum[0] || older) {
  console.error(`[dev] Node ${process.versions.node} no es compatible. Instala Node ${expected} o una versión posterior de la misma rama ${minimum[0]}.x y vuelve a ejecutar npm run dev.`);
  process.exit(1);
}

console.log(`[dev] Node ${process.versions.node} · ABI ${process.versions.modules}`);
const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
let addon;
try {
  // Load only the native addon: never open or modify the application's SQLite.
  addon = join(dirname(requireApi.resolve('better-sqlite3')), '../build/Release/better_sqlite3.node');
} catch {
  console.error('[dev] Faltan las dependencias de la API. Ejecuta pnpm install --frozen-lockfile y vuelve a intentar.');
  process.exit(1);
}

// Probe in a fresh process: an addon that failed dlopen must not be loaded
// again in the same process after its binary has been replaced on disk.
function probeSqlite() {
  const result = spawnSync(process.execPath, ['-e', `
    try { require(process.argv[1]); }
    catch (error) {
      process.stderr.write(JSON.stringify({ code: error.code, message: error.message }));
      process.exit(1);
    }
  `, addon], { cwd: root, encoding: 'utf8' });
  if (result.status === 0) return null;
  try { return JSON.parse(result.stderr); }
  catch { return { message: result.error?.message ?? result.stderr ?? 'No se pudo comprobar el binario nativo' }; }
}

let failure = probeSqlite();
if (failure) {
  if (!['ERR_DLOPEN_FAILED', 'MODULE_NOT_FOUND'].includes(failure.code)) {
    console.error('[dev] No se pudo comprobar SQLite:', failure.message);
    process.exit(1);
  }
  console.log('[dev] Preparando better-sqlite3 para el Node actual (solo cuando el binario falta o es incompatible)…');
  const result = spawnSync('pnpm', ['--filter', 'api', 'rebuild', 'better-sqlite3'], {
    cwd: root, stdio: 'inherit', shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) {
    console.error('[dev] No se pudo preparar SQLite. Revisa la salida anterior; no se iniciaron los servidores.');
    process.exit(1);
  }
  failure = probeSqlite();
  if (failure) {
    console.error('[dev] El binario de SQLite sigue sin cargar. No se iniciaron los servidores.');
    console.error(failure.message);
    process.exit(1);
  }
}
console.log('[dev] SQLite compatible. Iniciando compilación y servicios…');
