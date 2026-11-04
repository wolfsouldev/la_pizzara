import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verify, hash, argon2id } from 'argon2';
import { randomBytes } from 'node:crypto';
import { IdentityRepository } from '../../../database/repositories/identity.repository';
import { env } from '../../../config/environment';
import type { IdentityProvider, AuthenticatedIdentity } from './identity-provider';
import type { User } from '../../../database/schema';

@Injectable()
export class LocalDevelopmentIdentityProvider implements IdentityProvider {
  private dummyHash?: Promise<string>;
  constructor(private readonly identities: IdentityRepository) {}
  private identity(user: User): AuthenticatedIdentity {
    return { provider: 'local', externalId: user.id, username: user.username, displayName: user.displayName, email: user.email, department: null };
  }
  async authenticate(username: string, password: string): Promise<AuthenticatedIdentity> {
    if (env.NODE_ENV !== 'development' || env.AUTH_PROVIDER !== 'local') throw new UnauthorizedException('Credenciales no válidas');
    const row = this.identities.localIdentity(username);
    this.dummyHash ??= hash(randomBytes(32), { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    const valid = await verify(row?.credentials.passwordHash ?? await this.dummyHash, password);
    if (!valid || !row || !row.user.isActive) throw new UnauthorizedException('Credenciales no válidas');
    return this.identity(row.user);
  }
  developmentAccessAvailable() {
    if (env.NODE_ENV !== 'development' || env.AUTH_PROVIDER !== 'local' || !env.DEV_ACCESS_ENABLED) return false;
    return this.identities.localIdentity(env.DEV_ACCESS_USERNAME)?.user.isActive === true;
  }
  developmentIdentity(): AuthenticatedIdentity | undefined {
    if (!this.developmentAccessAvailable()) return;
    const row = this.identities.localIdentity(env.DEV_ACCESS_USERNAME);
    return row?.user.isActive ? this.identity(row.user) : undefined;
  }
}
