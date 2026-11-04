import { parseArgs } from 'node:util';
import { usernameSchema } from '@uni/shared';
import { DatabaseService } from '../database/database.service';
import { IdentityRepository } from '../database/repositories/identity.repository';
import { ProvisioningService } from '../modules/auth/provisioning.service';
import { confirmIdentity } from './cli';

async function main() {
  const { values } = parseArgs({ options: { username: { type: 'string' }, confirm: { type: 'string' } } });
  const username = usernameSchema.parse(values.username);
  const database = new DatabaseService();
  try {
    const provisioning = new ProvisioningService(new IdentityRepository(database));
    const user = provisioning.promotionCandidate(username);
    console.log(`Identidad: ${user.displayName} | ${user.username} | ${user.email ?? 'sin correo'} | ${user.authProvider} | ${user.id} | rol ${user.role}`);
    await confirmIdentity(user.username, values.confirm);
    provisioning.promote(user.id, user.username);
    console.log('Promoción ADMIN registrada en auditoría. Sesiones revocadas; vuelve a entrar.');
  } finally { database.onModuleDestroy(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'No se pudo promocionar'); process.exitCode = 1; });
