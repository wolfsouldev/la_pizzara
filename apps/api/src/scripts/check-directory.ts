import { LdapIdentityProvider } from '../modules/auth/providers/ldap-identity.provider';
async function main() {
  await new LdapIdentityProvider().checkConnection();
  console.log('LDAPS verificado: TLS, bind de lectura y acceso al DN base correctos. Falta validar login institucional autorizado.');
}
main().catch(() => { console.error('No se pudo verificar LDAPS. Revisa configuración, DNS, CA, conexión y permisos sin desactivar TLS.'); process.exitCode = 1; });
