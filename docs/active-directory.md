# Active Directory: intervención administrativa requerida

El desarrollo usa `AUTH_PROVIDER=local`. No existe conexión al dominio hasta configurar los valores reales. Nunca se crean identidades AD ni se cambian permisos de Windows desde la aplicación.

1. Identificar FQDN del controlador y CA institucional. Emitir certificado con SAN DNS del controlador, EKU Server Authentication y clave privada instalada en el controlador conforme al procedimiento de Microsoft.
2. Instalar certificado/cadena y habilitar LDAPS siguiendo [Microsoft: certificados para LDAP sobre SSL](https://learn.microsoft.com/windows-server/identity/ad-ds/configure-ldap-signing-certificates).
3. Verificar con `ldp.exe`: FQDN real, puerto 636, SSL. Abrir 636 únicamente desde el servidor de aplicación. Comprobar DNS y cadena completa.
4. Crear cuenta de lectura de mínimo privilegio (no Domain Admin). Debe buscar usuarios y leer objectGUID, sAMAccountName, userPrincipalName, displayName, givenName, sn, mail, department, distinguishedName, userAccountControl.
5. Exportar CA pública PEM, nunca su clave privada. Montar en ruta de `AD_CA_CERT_PATH` en API, solo lectura. Configurar AD_URL, AD_BASE_DN, AD_BIND_DN, AD_BIND_PASSWORD sin incluir secretos en Git.
6. Elegir `AD_LOGIN_ATTRIBUTE=sAMAccountName` o `userPrincipalName` según la identidad institucional admitida. No eliminar sufijos ni transformar UPN en nombres ambiguos.
7. Verificar TLS desde el servidor con `openssl s_client -connect "$DC_FQDN:636" -servername "$DC_FQDN" -CAfile "$CA_FILE" -verify_return_error`. No pasar claves ni contraseñas a este comando.
8. Configurar AUTH_PROVIDER=ldap, HTTPS y persistencia; verificar login con cuenta autorizada; promocionar por CLI después del primer login. No trasladar usuarios locales a producción.

La implementación admite LDAPS exclusivamente. StartTLS no está habilitado como fallback. Nunca usar `NODE_TLS_REJECT_UNAUTHORIZED=0` ni `rejectUnauthorized=false`.

Pendiente externo: FQDN, DN base, cuenta de lectura, certificado de CA, DNS/firewall, cuenta institucional de verificación y URL HTTPS definitiva.


## Comprobación desde el despliegue (fase 9)

Con valores institucionales configurados y CA pública montada:

```bash
./infra/scripts/compose.sh run --rm --no-deps api node dist/scripts/check-directory.js
```

Comprueba negociación TLS validada, bind de servicio y búsqueda base de lectura. No crea/modifica objetos ni imprime atributos/contraseñas. No prueba por sí sola el bind de un usuario: completar el login real por HTTPS y comprobar perfil/rol USER antes del bootstrap por consola. En desarrollo con proveedor LDAP también existe `pnpm --filter api ad:check`.

El secreto puede venir de `AD_BIND_PASSWORD_FILE` absoluto/privado, sin exponerlo como valor interpolado en Compose; no definir ambos mecanismos. La CA debe contener certificados CA PEM públicos vigentes, sin clave privada. FQDN/SAN, cadena de confianza y comprobación TLS siguen obligatorios; CA web y CA del AD pueden ser diferentes.

No hay LDAP de pruebas, bind sin cifrar, bypass TLS ni cuenta institucional precargada. La aplicación arranca con configuración LDAP válida pero no contacta el dominio hasta comprobarlo/iniciar sesión/revalidar; health SQLite no representa salud de AD. Preparación LDAPS del Windows Server y reglas de red siguen siendo tareas administrativas externas.
