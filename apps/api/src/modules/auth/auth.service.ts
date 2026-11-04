import { Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { SessionUser } from '@uni/shared';
import { env } from '../../config/environment';
import { LocalDevelopmentIdentityProvider } from './providers/local-development-identity.provider';
import { LdapIdentityProvider } from './providers/ldap-identity.provider';
import { IdentityRepository } from '../../database/repositories/identity.repository';
import { SessionService, type SessionContext } from './session.service';
import type { AuthenticatedIdentity } from './providers/identity-provider';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(private readonly local: LocalDevelopmentIdentityProvider, private readonly ldap: LdapIdentityProvider,
    private readonly identities: IdentityRepository, private readonly sessions: SessionService) {}

  onModuleInit() {
    if (env.NODE_ENV === 'production' && this.identities.hasLocalUsers()) throw new Error('No se admite una base con identidades locales en producción. Usa una base institucional limpia.');
  }
  private finishLogin(identity: AuthenticatedIdentity, req: Request, res: Response, mode: 'credentials' | 'development') {
    const user = this.identities.sync(identity);
    if (!user) throw new UnauthorizedException('Credenciales no válidas');
    return this.profile(this.sessions.create(user, req, res, mode));
  }
  async login(username: string, password: string, req: Request, res: Response) {
    this.sessions.assertLoginCsrf(req);
    const provider = env.AUTH_PROVIDER === 'local' ? this.local : this.ldap;
    const identity = await provider.authenticate(username, password);
    return this.finishLogin(identity, req, res, 'credentials');
  }
  developmentLogin(req: Request, res: Response) {
    // This exception is explicit, local-only and never makes protected routes public.
    const identity = this.local.developmentIdentity();
    if (!identity) throw new NotFoundException('Entrada de desarrollo no disponible');
    this.sessions.assertLoginCsrf(req);
    return this.finishLogin(identity, req, res, 'development');
  }
  prelogin(res: Response) {
    return { csrfToken: this.sessions.anonymousCsrf(res), provider: env.AUTH_PROVIDER, developmentAccessAvailable: this.local.developmentAccessAvailable() };
  }
  profile({ user, session, csrfToken }: SessionContext): SessionUser {
    return { id: user.id, username: user.username, displayName: user.displayName, email: user.email, role: user.role,
      authProvider: user.authProvider, departments: this.identities.departments(user.id), csrfToken,
      lastLoginAt: user.lastLoginAt, sessionExpiresAt: session.expiresAt, sessionAbsoluteExpiresAt: session.absoluteExpiresAt };
  }
}
