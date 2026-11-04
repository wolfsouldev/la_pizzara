export interface AuthenticatedIdentity {
  provider: 'local' | 'ldap';
  externalId: string;
  username: string;
  displayName: string;
  email: string | null;
  department: string | null;
}
export interface IdentityProvider {
  authenticate(username: string, password: string): Promise<AuthenticatedIdentity>;
}
