import { config } from 'dotenv';
import { resolve, isAbsolute } from 'node:path';
import { z } from 'zod';
import { isIP } from 'node:net';
import { readFileSync, statSync } from 'node:fs';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
// Compose mounts the secret as a file; its content is never printed or baked in an image.
if (process.env.AD_BIND_PASSWORD_FILE) {
  if (process.env.AD_BIND_PASSWORD) throw new Error('Configura AD_BIND_PASSWORD o AD_BIND_PASSWORD_FILE, no ambos');
  try {
    const file = process.env.AD_BIND_PASSWORD_FILE;
    if (!isAbsolute(file) || (statSync(file).mode & 0o077) !== 0) throw new Error();
    const value = readFileSync(file, 'utf8');
    if (value.length > 4096) throw new Error();
    process.env.AD_BIND_PASSWORD = value.replace(/\r?\n$/, '');
  } catch { throw new Error('No se pudo leer el secreto AD; exige archivo absoluto privado y legible'); }
}
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  APP_HOST: z.string().default('127.0.0.1'),
  APP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.url().default('http://localhost:5173'),
  APP_ADDITIONAL_ORIGINS: z.string().default('').transform(value => value.split(',').map(origin => origin.trim()).filter(Boolean)),
  DATABASE_URL: z.string().min(1).default('./data/university.sqlite'),
  BACKUP_DIRECTORY: z.string().min(1).default('./backups'),
  AUTH_PROVIDER: z.enum(['local', 'ldap']).default('local'),
  DEV_ACCESS_ENABLED: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  DEV_ACCESS_USERNAME: z.string().trim().max(254).default(''),
  AD_URL: z.string().default(''), AD_BASE_DN: z.string().default(''), AD_BIND_DN: z.string().default(''), AD_BIND_PASSWORD: z.string().default(''), AD_CA_CERT_PATH: z.string().default(''),
  AD_DOMAIN_ADMINS_GROUP_DN: z.string().trim().default(''),
  AD_LOGIN_ATTRIBUTE: z.enum(['sAMAccountName', 'userPrincipalName']).default('sAMAccountName'),
  AD_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  AD_OPERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  AD_RECHECK_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  SESSION_IDLE_HOURS: z.coerce.number().positive().max(168).default(168),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().positive().max(168).default(168),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  TRUST_PROXY: z.string().default(''), LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
}).superRefine((v, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  const origin = new URL(v.APP_ORIGIN);
  if (origin.origin !== v.APP_ORIGIN) fail('APP_ORIGIN debe contener solamente esquema, host y puerto');
  for (const additional of v.APP_ADDITIONAL_ORIGINS) {
    try {
      const parsed = new URL(additional);
      if (parsed.origin !== additional || parsed.hostname.includes('*') || parsed.username || parsed.password) fail('APP_ADDITIONAL_ORIGINS solo admite orígenes exactos (esquema, host y puerto), sin comodines ni credenciales');
      if (v.NODE_ENV === 'production' && parsed.protocol !== 'https:') fail('Los orígenes adicionales de producción deben usar HTTPS');
      if (additional === v.APP_ORIGIN) fail('No repitas APP_ORIGIN en APP_ADDITIONAL_ORIGINS');
    } catch { fail('APP_ADDITIONAL_ORIGINS contiene un origen no válido'); }
  }
  if (v.DATABASE_URL === ':memory:' || v.DATABASE_URL.includes('mode=memory')) fail('SQLite debe persistir en archivo');
  if (v.NODE_ENV === 'production') {
    if (v.DEV_ACCESS_ENABLED) fail('Producción no admite entrada de desarrollo');
    if (!v.TRUST_PROXY) fail('Producción exige TRUST_PROXY explícito del reverse proxy');
    if (!isAbsolute(v.BACKUP_DIRECTORY) || v.BACKUP_DIRECTORY.startsWith('/tmp/')) fail('Producción exige BACKUP_DIRECTORY absoluta persistente');
    if (v.AUTH_PROVIDER !== 'ldap') fail('Producción exige AUTH_PROVIDER=ldap');
    if (origin.protocol !== 'https:') fail('Producción exige APP_ORIGIN HTTPS');
    if (!isAbsolute(v.DATABASE_URL) || v.DATABASE_URL.startsWith('/tmp/')) fail('Producción exige DATABASE_URL absoluta en volumen persistente local');
  }
  if (v.DEV_ACCESS_ENABLED) {
    if (v.NODE_ENV !== 'development' || v.AUTH_PROVIDER !== 'local') fail('Entrada de desarrollo exige NODE_ENV=development y AUTH_PROVIDER=local');
    if (!/^[\p{L}\p{N}._-]+$/u.test(v.DEV_ACCESS_USERNAME)) fail('DEV_ACCESS_USERNAME debe identificar un usuario local registrado por CLI');
    if (!['127.0.0.1', '::1'].includes(v.APP_HOST) || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) fail('Entrada sin credenciales limitada a loopback; no publicar en LAN');
  }
  if (v.AUTH_PROVIDER === 'ldap') {
    for (const key of ['AD_URL', 'AD_BASE_DN', 'AD_BIND_DN', 'AD_BIND_PASSWORD', 'AD_CA_CERT_PATH'] as const) if (!v[key]) fail(`${key} obligatorio para LDAP`);
    try {
      const url = new URL(v.AD_URL);
      if (url.protocol !== 'ldaps:') fail('Solo se admite LDAPS con TLS verificado');
      if (!url.hostname || url.username || url.password || url.search || url.hash || (url.pathname && url.pathname !== '/')) fail('AD_URL debe contener solo esquema, servidor y puerto; nunca credenciales');
    } catch { fail('AD_URL no válida'); }
  }
  if (v.TRUST_PROXY && v.TRUST_PROXY.split(',').some(part => {
    const [ip, prefix, ...extra] = part.trim().split('/');
    const version = isIP(ip ?? '');
    return !version || extra.length > 0 || (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) > (version === 4 ? 32 : 128)));
  })) fail('TRUST_PROXY debe contener solo IPs o CIDR explícitos');
});
const result = schema.safeParse(process.env);
if (!result.success) throw new Error(`Configuración no válida: ${result.error.issues.map(i => i.message).join('; ')}`);
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('No se permite desactivar TLS');
export const env = result.data;
export const allowedOrigins = new Set([env.APP_ORIGIN, ...env.APP_ADDITIONAL_ORIGINS]);
