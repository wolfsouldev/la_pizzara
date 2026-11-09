import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { Client, InvalidCredentialsError, SizeLimitExceededError, type Entry } from 'ldapts';
import { readDirectoryCa } from '../../../config/directory-ca';
import { env } from '../../../config/environment';
import type { AuthenticatedIdentity, IdentityProvider } from './identity-provider';

function escapeFilter(value: string) { return value.replace(/[\\*()\0]/g, c => `\\${c.charCodeAt(0).toString(16).padStart(2, '0')}`); }
function attribute(entry: Entry, key: string) {
  const value = entry[Object.keys(entry).find(k => k.toLowerCase() === key.toLowerCase()) ?? key];
  return Array.isArray(value) ? value[0] : value;
}
function text(entry: Entry, key: string): string | null { const value = attribute(entry, key); return typeof value === 'string' && value ? value : null; }
function guidBytes(entry: Entry) {
  const b = attribute(entry, 'objectGUID');
  if (!Buffer.isBuffer(b) || b.length !== 16) throw new ServiceUnavailableException('El directorio devolvió una identidad no válida');
  return b;
}
function stableGuid(b: Buffer) {
  return `${b.readUInt32LE(0).toString(16).padStart(8, '0')}-${b.readUInt16LE(4).toString(16).padStart(4, '0')}-${b.readUInt16LE(6).toString(16).padStart(4, '0')}-${b.subarray(8, 10).toString('hex')}-${b.subarray(10).toString('hex')}`;
}
function guidFilter(guid: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(guid)) throw new UnauthorizedException('Sesión no válida');
  const parts = guid.split('-'); const b = Buffer.alloc(16);
  b.writeUInt32LE(parseInt(parts[0]!, 16), 0); b.writeUInt16LE(parseInt(parts[1]!, 16), 4); b.writeUInt16LE(parseInt(parts[2]!, 16), 6);
  Buffer.from(parts[3]! + parts[4]!, 'hex').copy(b, 8);
  return [...b].map(n => `\\${n.toString(16).padStart(2, '0')}`).join('');
}

@Injectable()
export class LdapIdentityProvider implements IdentityProvider {
  private readonly ca: Buffer | undefined;
  constructor() {
    if (env.AUTH_PROVIDER === 'ldap') { this.ca = readDirectoryCa(env.AD_CA_CERT_PATH); }
  }
  private client() {
    return new Client({ url: env.AD_URL, connectTimeout: env.AD_CONNECT_TIMEOUT_MS, timeout: env.AD_OPERATION_TIMEOUT_MS,
      tlsOptions: { ca: this.ca, rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: new URL(env.AD_URL).hostname } });
  }
  private enabled(entry: Entry) {
    const control = text(entry, 'userAccountControl');
    return control !== null && /^\d+$/.test(control) && (Number(control) & 2) === 0;
  }
  private async search(client: Client, filter: string) {
    await client.bind(env.AD_BIND_DN, env.AD_BIND_PASSWORD);
    try {
      const result = await client.search(env.AD_BASE_DN, { scope: 'sub', filter: `(&(objectCategory=person)(objectClass=user)${filter})`, sizeLimit: 2,
        attributes: ['objectGUID', 'sAMAccountName', 'userPrincipalName', 'displayName', 'givenName', 'sn', 'mail', 'department', 'distinguishedName', 'userAccountControl'], explicitBufferAttributes: ['objectGUID'] });
      // A subtree search rooted at the domain naming context can legitimately
      // return referrals to AD's DomainDnsZones, ForestDnsZones, and Configuration
      // partitions. They are outside the configured user-search base; only entries
      // matching the filter within that base participate in identity selection.
      if (result.searchEntries.length !== 1) throw new UnauthorizedException('Credenciales no válidas');
      return result.searchEntries[0]!;
    } catch (error) { if (error instanceof SizeLimitExceededError) throw new UnauthorizedException('Credenciales no válidas'); throw error; }
  }
  async authenticate(username: string, password: string): Promise<AuthenticatedIdentity> {
    if (env.AUTH_PROVIDER !== 'ldap' || !password || (env.AD_LOGIN_ATTRIBUTE === 'sAMAccountName' && username.includes('@')) ||
      (env.AD_LOGIN_ATTRIBUTE === 'userPrincipalName' && !/^[^@]+@[^@]+$/.test(username))) throw new UnauthorizedException('Credenciales no válidas');
    const service = this.client(); let userClient: Client | undefined;
    try {
      const entry = await this.search(service, `(${env.AD_LOGIN_ATTRIBUTE}=${escapeFilter(username)})`);
      if (!this.enabled(entry)) throw new UnauthorizedException('Credenciales no válidas');
      userClient = this.client();
      try { await userClient.bind(entry.dn, password); }
      catch (error) { if (error instanceof InvalidCredentialsError) throw new UnauthorizedException('Credenciales no válidas'); throw error; }
      const canonicalUsername = text(entry, env.AD_LOGIN_ATTRIBUTE);
      if (!canonicalUsername) throw new UnauthorizedException('Credenciales no válidas');
      return { provider: 'ldap', externalId: stableGuid(guidBytes(entry)), username: canonicalUsername,
        displayName: text(entry, 'displayName') ?? ([text(entry, 'givenName'), text(entry, 'sn')].filter(Boolean).join(' ') || canonicalUsername),
        email: text(entry, 'mail'), department: text(entry, 'department') };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('El directorio no está disponible');
    } finally { await Promise.allSettled([service.unbind(), ...(userClient ? [userClient.unbind()] : [])]); }
  }
  async checkConnection(): Promise<void> {
    if (env.AUTH_PROVIDER !== 'ldap') throw new Error('La comprobación exige AUTH_PROVIDER=ldap');
    const client = this.client();
    try {
      await client.bind(env.AD_BIND_DN, env.AD_BIND_PASSWORD);
      const result = await client.search(env.AD_BASE_DN, { scope: 'base', filter: '(objectClass=*)', attributes: ['distinguishedName'], sizeLimit: 1 });
      if (result.searchEntries.length !== 1 || result.searchReferences.length) throw new Error();
    } catch { throw new Error('No se pudo verificar LDAPS, cuenta de lectura y DN base; revisa DNS, TLS y permisos sin desactivar su validación'); }
    finally { await client.unbind().catch(() => undefined); }
  }
  async checkEnabled(externalId: string): Promise<boolean> {
    const client = this.client();
    try { const entry = await this.search(client, `(objectGUID=${guidFilter(externalId)})`); return this.enabled(entry) && stableGuid(guidBytes(entry)) === externalId; }
    catch (error) { if (error instanceof UnauthorizedException) return false; throw new ServiceUnavailableException('No se pudo verificar el estado de la cuenta institucional'); }
    finally { await client.unbind().catch(() => undefined); }
  }
}
