import { parseArgs } from 'node:util';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { usernameSchema } from '@uni/shared';
import { env } from '../config/environment';
import { DatabaseService } from '../database/database.service';
import { IdentityRepository } from '../database/repositories/identity.repository';
import { ProvisioningService } from '../modules/auth/provisioning.service';
import { readSecret } from './cli';

async function main() {
  if (env.NODE_ENV !== 'development' || env.AUTH_PROVIDER !== 'local') throw new Error('Usuarios locales exclusivamente en desarrollo con AUTH_PROVIDER=local');
  const { values } = parseArgs({ options: { username: { type: 'string' }, 'display-name': { type: 'string' }, email: { type: 'string' }, 'random-password': { type: 'boolean', default: false } } });
  const username = usernameSchema.parse(values.username);
  const displayName = z.string().trim().min(2).max(160).parse(values['display-name']);
  const email = values.email ? z.email().parse(values.email) : null;
  const password = values['random-password'] ? randomBytes(32).toString('base64url')
    : z.string().min(12, 'Contraseña mínima de 12 caracteres').max(1024).parse(await readSecret('Contraseña local (no se muestra): '));
  if (!values['random-password'] && process.stdin.isTTY && password !== await readSecret('Repetir contraseña: ')) throw new Error('Contraseñas distintas');
  const database = new DatabaseService();
  try {
    const provisioning = new ProvisioningService(new IdentityRepository(database));
    const user = await provisioning.createLocal({ username, displayName, email }, password);
    console.log(`Usuario local creado: ${user.username} | ${user.displayName} | ${user.id} | rol ${user.role}. No es una identidad institucional.`);
    if (values['random-password']) console.log('Contraseña aleatoria protegida con Argon2id y descartada, no recuperable. Para entrar sin credenciales, configura DEV_ACCESS_USERNAME explícitamente.');
  } finally { database.onModuleDestroy(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'No se pudo crear el usuario'); process.exitCode = 1; });
