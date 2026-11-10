import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Request, Response, CookieOptions } from 'express';
import { allowedOrigins, env } from '../../config/environment';
import { IdentityRepository } from '../../database/repositories/identity.repository';
import { LdapIdentityProvider } from './providers/ldap-identity.provider';
import type { User, AuthSession } from '../../database/schema';

export interface SessionContext { user: User; session: AuthSession; csrfToken: string }
declare global { namespace Express { interface Request { sessionContext?: SessionContext } } }
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
// Deterministically recover CSRF for /me without storing raw secrets in SQLite.
function csrfFor(token: string) { return createHmac('sha256', token).update('university-platform/csrf/v1').digest('hex'); }
function equals(a: string, b: string) { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }

@Injectable()
export class SessionService {
  readonly cookieName = env.NODE_ENV === 'production' ? '__Host-uni.sid' : 'uni.sid';
  readonly csrfCookieName = env.NODE_ENV === 'production' ? '__Host-uni.csrf' : 'uni.csrf';
  private readonly options: CookieOptions = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
  constructor(private readonly identities: IdentityRepository, private readonly ldap: LdapIdentityProvider) {}

  token(req: Request) {
    const value: unknown = req.cookies?.[this.cookieName];
    return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
  }
  assertOrigin(req: Request) {
    if (!allowedOrigins.has(req.get('Origin') ?? '')) throw new ForbiddenException('Origen no permitido');
    if (env.NODE_ENV === 'production' && !req.secure) throw new ForbiddenException('Se requiere HTTPS');
  }
  async resolve(req: Request): Promise<SessionContext | undefined> {
    if (env.NODE_ENV === 'production' && !req.secure) return;
    const token = this.token(req);
    if (!token) return;
    const background=req.method==='GET'&&(/^\/api\/v1\/(?:auth\/me|notifications(?:\/unread-count)?|(?:staff|admin)\/dashboard)\/?$/.test(req.path)||/^\/api\/v1\/(?:staff\/)?tickets\/[a-f0-9-]{36}(?:\/(?:comments|events|service))?\/?$/i.test(req.path));
    const catalogBackground = req.method === 'GET' && /^\/api\/v1\/(?:admin\/)?services(?:\/[a-f0-9-]{36}(?:\/notes)?)?\/?$/i.test(req.path);
    return this.resolveToken(token, !background && !catalogBackground);
  }
  async resolveRealtime(token:string,csrfToken:string,origin:string|undefined,secure:boolean):Promise<SessionContext|undefined> {
    if(!origin||!allowedOrigins.has(origin)||(env.NODE_ENV==='production'&&!secure)||!(/^[a-f0-9]{64}$/.test(token)))return;
    const context=await this.resolveToken(token,false);
    return context&&equals(hashToken(csrfToken),context.session.csrfTokenHash)?context:undefined;
  }
  private async resolveToken(token:string,touch=true):Promise<SessionContext|undefined> {
    let row = this.identities.session(hashToken(token));
    if (!row || row.user.authProvider !== env.AUTH_PROVIDER) return;
    if (row.user.authProvider === 'ldap' && Date.now() - (row.user.directoryCheckedAt ?? 0) >= env.AD_RECHECK_SECONDS * 1000) {
      const account = row.user.externalId ? await this.ldap.inspectAccount(row.user.externalId) : { enabled: false, isDomainAdmin: false };
      if (!account.enabled) {
        this.identities.revokeUser(row.user.id);
        throw new UnauthorizedException('Sesión no válida');
      }
      // Group-derived administrator access is periodically reconciled too. A
      // role change revokes the current session and requires a fresh login.
      if (this.identities.syncDirectoryRole(row.user.id, account.isDomainAdmin)) throw new UnauthorizedException('El acceso institucional cambió; inicia sesión de nuevo');
      this.identities.directoryChecked(row.user.id);
      // LDAP awaited I/O: honor local disable, role/session changes or expiry
      // that happened while the directory was being consulted.
      row = this.identities.session(hashToken(token));
      if (!row || row.user.authProvider !== env.AUTH_PROVIDER) return;
    }
    const expiresAt = Math.min(Date.now() + env.SESSION_IDLE_HOURS * 3600000, row.session.absoluteExpiresAt);
    if(touch)this.identities.touch(row.session.id, expiresAt);
    return { user: row.user, session: touch?{ ...row.session, expiresAt }:row.session, csrfToken: csrfFor(token) };
  }
  assertCsrf(req: Request, context: SessionContext) {
    this.assertOrigin(req);
    const header = req.get('X-CSRF-Token');
    if (!header || !equals(hashToken(header), context.session.csrfTokenHash)) throw new ForbiddenException('Token CSRF no válido');
  }
  anonymousCsrf(res: Response) {
    const token = randomBytes(32).toString('hex');
    res.cookie(this.csrfCookieName, token, { ...this.options, maxAge: 15 * 60000 });
    return token;
  }
  assertLoginCsrf(req: Request) {
    this.assertOrigin(req);
    const cookie: unknown = req.cookies?.[this.csrfCookieName];
    const header = req.get('X-CSRF-Token');
    if (typeof cookie !== 'string' || !/^[a-f0-9]{64}$/.test(cookie) || !header || !equals(cookie, header)) throw new ForbiddenException('Token CSRF no válido');
  }
  create(user: User, req: Request, res: Response, mode: 'credentials' | 'development') {
    const now = Date.now(); const token = randomBytes(32).toString('hex');
    const absoluteExpiresAt = now + env.SESSION_ABSOLUTE_HOURS * 3600000;
    const session = { id: randomUUID(), userId: user.id, tokenHash: hashToken(token), csrfTokenHash: hashToken(csrfFor(token)), createdAt: now,
      lastSeenAt: now, expiresAt: Math.min(now + env.SESSION_IDLE_HOURS * 3600000, absoluteExpiresAt), absoluteExpiresAt, revokedAt: null };
    const previousToken = this.token(req);
    if (!this.identities.createSession(session, previousToken ? hashToken(previousToken) : undefined, mode)) throw new UnauthorizedException('Credenciales no válidas');
    res.cookie(this.cookieName, token, { ...this.options, maxAge: env.SESSION_ABSOLUTE_HOURS * 3600000 });
    res.clearCookie(this.csrfCookieName, this.options);
    return { user, session, csrfToken: csrfFor(token) } satisfies SessionContext;
  }
  logout(req: Request, res: Response) {
    const token = this.token(req);
    if (token) this.identities.revoke(hashToken(token));
    res.clearCookie(this.cookieName, this.options);
    res.clearCookie(this.csrfCookieName, this.options);
  }
}
