import { Injectable } from '@nestjs/common';
import { hash, argon2id } from 'argon2';
import { env } from '../../config/environment';
import { IdentityRepository } from '../../database/repositories/identity.repository';

@Injectable()
export class ProvisioningService {
  constructor(private readonly identities: IdentityRepository) {}
  async createLocal(input: { username: string; displayName: string; email: string | null }, password: string) {
    if (env.NODE_ENV !== 'development' || env.AUTH_PROVIDER !== 'local') throw new Error('Usuarios locales exclusivamente en desarrollo con AUTH_PROVIDER=local');
    const passwordHash = await hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    return this.identities.createLocal(input, passwordHash);
  }
  promotionCandidate(username: string) {
    const matches = this.identities.byUsername(env.AUTH_PROVIDER, username);
    if (matches.length !== 1 || !matches[0]?.isActive || !matches[0].lastLoginAt) throw new Error('Requiere un único usuario activo del proveedor configurado que ya haya iniciado sesión');
    return matches[0];
  }
  promote(id: string, username: string) {
    if (!this.identities.promoteAdmin(id, username, env.AUTH_PROVIDER)) throw new Error('La identidad cambió o dejó de estar activa; no se aplicó la promoción');
  }
}
