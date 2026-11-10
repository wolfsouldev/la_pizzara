# Despliegue del MVP — fase 9

**Preparado para instalar; no equivale a despliegue institucional realizado.** Los contenedores y flujos verificables localmente están registrados en [progress.md](progress.md). FQDN/IP reales, CA, cuenta de servicio, DNS, firewall, acceso AD y primer administrador institucional requieren intervención del equipo de la universidad. No se inventan ni se modifican automáticamente.

## 1. Requisitos del servidor

- Linux con Docker Engine y **Docker Compose plugin** (`docker compose version`); operador autorizado. El acceso al socket de Docker equivale a privilegios administrativos: no exponerlo ni montarlo en los servicios.
- Disco local persistente (ext4/XFS/Btrfs), espacio para base y varias copias; **no NFS/SMB/tmpfs**, una sola API. UID/GID del proceso API: **1000:1000**. Adaptar propiedad del directorio del host, no ejecutar API como root ni hacer chmod 777.
- DNS interno: el FQDN web resuelve a la interfaz LAN/VPN del servidor; el contenedor API resuelve el FQDN real del controlador AD. La red Docker elegida no debe solaparse con LAN/VPN/DNS.
- LDAPS válido con la CA pública y cuenta de lectura de mínimos permisos. Véase [Active Directory](active-directory.md).
- Certificado web institucional **o** CA interna de Caddy distribuida como raíz confiable a clientes. No saltarse validación TLS.

Las imágenes fijan Node 26.13.0 LTS Debian bookworm y Caddy 2.11.7 Alpine; pnpm 12.15.0 y dependencias del lockfile. Build multietapa: no se montan repositorio, node_modules del host, .env ni certificados dentro de la imagen. La API ejecuta solo artefactos compilados/dependencias de producción, sin pnpm/tsx/gcc. El servidor de archivos web es otra instancia de Caddy, sin puertos publicados.

## 2. Preparar configuración y permisos

Desde la raíz del proyecto:

```bash
cp infra/env/production.env.example infra/env/production.env
chmod 600 infra/env/production.env
sudo install -d -o 1000 -g 1000 -m 700 \
  /var/lib/university-platform/data \
  /var/lib/university-platform/backups
sudo install -d -m 700 /var/lib/university-platform/secrets /var/lib/university-platform/certs/web
```

Editar `production.env` manualmente. No copiar el `.env` ni SQLite de desarrollo.

| Variable | Configuración real requerida |
|---|---|
| APP_DOMAIN | FQDN web sin esquema, puerto ni ruta |
| APP_ORIGIN | Origen exacto `https://` del navegador, sin `/` final; normalmente puerto 443 implícito |
| PUBLIC_BIND_IP | IP de interfaz LAN/VPN del host, **no** 0.0.0.0 para publicar indiscriminadamente |
| APP_SUBNET | CIDR Docker libre confirmado por administrador; revisar redes y rutas LAN/VPN |
| APP_DYNAMIC_RANGE | Sub-CIDR de APP_SUBNET para asignación dinámica API/web; **excluye CADDY_IPV4** y gateway |
| CADDY_IPV4 | Dirección fija libre dentro de APP_SUBNET, fuera de APP_DYNAMIC_RANGE y distinta de gateway; API confía **solo** en ella |
| AD_URL | LDAPS con FQDN del DC que coincide con certificado y puerto accesible |
| AD_BASE_DN / AD_BIND_DN | DN base y cuenta institucional de lectura reales |
| AD_DOMAIN_ADMINS_GROUP_DN | Opcional: DN exacto del grupo `Domain Admins` si no está en el contenedor predeterminado `CN=Users` |
| AD_CA_CERT_FILE | Archivo absoluto de CA pública PEM del AD en host; no leaf ni clave privada |
| AD_BIND_PASSWORD_FILE | Archivo absoluto privado del host con contraseña de servicio |
| WEB_TLS_DIRECTORY | Directorio de certificados web (existente incluso en modo `internal`) |
| RELEASE_TAG | Etiqueta local de versión conservada para rollback, no `latest` |

Las rutas relativas de Compose se anclan en `infra`; las rutas operativas del ejemplo son absolutas. No imprimir `docker compose config` con secretos en variables; usar `config --quiet`. Aquí la contraseña se monta desde archivo, no se interpola como texto en Compose ni aparece en `docker inspect` como variable de contraseña.

### Acceso de emergencia por IP

El dominio es la dirección canónica (`APP_DOMAIN`/`APP_ORIGIN`); además, Compose
configura el origen HTTPS exacto de `PUBLIC_BIND_IP` como origen adicional
permitido en CSRF y Socket.IO. Caddy redirige HTTP-IP a HTTPS-IP y sirve esa IP
con su CA interna, incluso cuando el dominio usa certificado institucional. Por
tanto `https://<PUBLIC_BIND_IP>` ofrece el mismo login y las mismas operaciones
que el dominio. La IP no se añade como origen comodín; no se debe abrir acceso
público si el host solo está autorizado en LAN/VPN.

Los navegadores deben confiar en la raíz pública de Caddy para validar el
certificado emitido para la IP. Distribuir esa raíz pública en cada cliente
autorizado; no saltarse el aviso del certificado ni distribuir claves privadas.
Si falla DNS pero el servidor/IP siguen accesibles, se puede usar la IP HTTPS; si
el servidor o la ruta de red están caídos, ninguna de las dos direcciones sirve.

Crear el secreto desde consola sin incluirlo en argumentos/historial (Bash; sustituir únicamente la ruta por la configurada):

```bash
sudo install -o 1000 -g 1000 -m 400 /dev/null /var/lib/university-platform/secrets/ad-password
read -rsp 'Contraseña de servicio AD: ' AD_SECRET_VALUE; printf '\n'
printf '%s' "$AD_SECRET_VALUE" | sudo tee /var/lib/university-platform/secrets/ad-password >/dev/null
unset AD_SECRET_VALUE
```

La API exige secreto legible con permisos solo de propietario; no configurar simultáneamente `AD_BIND_PASSWORD` y `AD_BIND_PASSWORD_FILE`. El archivo no necesita salto final; si tiene uno CRLF/LF se retira únicamente ese salto. Nunca entregar contraseñas por chat ni versionarlas.

Instalar la CA pública del AD como archivo legible por UID 1000 (por ejemplo 0444 dentro de un directorio de certificados no secreto con acceso de lectura). La clave privada del **controlador de dominio** no se exporta. El PEM exige certificados CA no caducados; TLS valida cadena, SAN/FQDN y mínimo TLS 1.2.

## 3. Elegir HTTPS web

### CA institucional

Instalar cadena y clave web en `WEB_TLS_DIRECTORY` como `server.crt` y `server.key`; clave propiedad root/permisos 0400, directorio 0700. Caddy de entrada puede leerlos; la API nunca monta la clave web.

```env
CADDY_TLS_CERT=/etc/caddy/tls/server.crt
CADDY_TLS_KEY=/etc/caddy/tls/server.key
```

La cadena web es independiente de la CA de LDAPS. Renovar el certificado con el procedimiento institucional y recrear Caddy para cargarlo. No instalar claves privadas en clientes.

### Caddy internal

```env
CADDY_TLS_CERT=internal
CADDY_TLS_KEY=
```

La CA se conserva en el volumen `caddy_data`. Tras el primer arranque exportar **solo** la raíz pública y distribuirla por el procedimiento institucional a los equipos autorizados:

```bash
./infra/scripts/compose.sh cp caddy:/data/caddy/pki/authorities/local/root.crt ./campus-web-root.crt
```

No borrar el volumen ni distribuir root.key/intermediate.key. Guardar una copia protegida del volumen CA si se desea conservar la misma autoridad durante recuperación del servidor. Un navegador sin esa raíz confiada debe mostrar error: no resolverlo desactivando TLS. Para comprobar desde consola, usar `curl --cacert ./campus-web-root.crt "$APP_ORIGIN/api/v1/health"` con el origen real configurado.

## 4. Firewall y acceso a red

**Obligatorio antes de publicar:**

1. Permitir entrada TCP 443 y, si se desea redirección, TCP 80 únicamente desde los CIDR universitarios/VPN autorizados hacia `PUBLIC_BIND_IP`.
2. Bloquear esas entradas desde cualquier otro origen, incluidas interfaces públicas/IPv6 y reenvíos de router. No crear un NAT/túnel público.
3. Aplicar las reglas en firewall perimetral/host compatible con los puertos publicados por Docker; no asumir que reglas genéricas UFW previas cubren DNAT de Docker. Validar desde un cliente autorizado **y otro no autorizado**.
4. Permitir salida de API hacia DNS institucional y TCP 636 del DC; definir el enrutamiento/DNS real. No habilitar LDAP simple ni desactivar verificación para atravesar un fallo.
5. No publicar 3000/8080. Compose solo publica Caddy; no usar `--network host`, escalar API o añadir otro proxy sin revisar Origin, IP cliente y trust proxy.

No se modifican automáticamente reglas de host, AD, certificados del DC ni DNS. El enlace a una interfaz reduce exposición, **no sustituye** el firewall ni prueba por sí solo aislamiento LAN/VPN.

## 5. Construir, verificar y arrancar

```bash
./infra/scripts/compose.sh config --quiet
./infra/scripts/compose.sh build
./infra/scripts/compose.sh run --rm --no-deps api node dist/scripts/check-directory.js
./infra/scripts/compose.sh up -d --wait
./infra/scripts/compose.sh ps
./infra/scripts/compose.sh logs --tail=100 api caddy
```

`check-directory` aún no necesita una base migrada: verifica TLS real, bind de lectura y acceso al DN base sin imprimir atributos, claves ni contraseñas. No simula un login de usuario; si falla, corregir DNS/CA/LDAPS/permisos antes de entregar el sistema. Para un fichero de configuración fuera del repositorio: `DEPLOY_ENV_FILE=/ruta/privada/production.env ./infra/scripts/compose.sh ...`.

En arranque normal:
- Preflight exige `/data` y `/backups` montados, privados y escribibles; base regular no simbólica; SQLite fuera de RAM/filesystem de red; secreto y CA válidos.
- Bloqueo `flock` sobre `/data/.university.lock`: una única API y ninguna restauración simultánea. Código 75 si está ocupado; no borrar el archivo ni saltarse el bloqueo.
- Si hay migraciones pendientes sobre una base existente, crea y verifica copia consistente **antes** de aplicar. Si falla copia/migración, no arranca API. Reinicios sin cambios de esquema no generan una copia nueva cada vez.
- Aplica migraciones Drizzle versionadas, sin `push`; escucha en 3000 interno. SQLite WAL, foreign_keys ON y busy_timeout 5000.
- Una base con cualquier identidad local de desarrollo se rechaza en producción, aunque el proveedor configurado sea LDAP. Iniciar base institucional nueva.
- CSP permite HTTP del mismo origen y WSS del mismo host/puerto explícito, sin abrir conexiones a cualquier servidor externo. Caddy espera salud de web/API; publica HTTPS y redirige HTTP, preservando `/api/*` y upgrade de WebSocket. No hay CORS entre web/API.

El endpoint público de salud solo comunica disponibilidad genérica. Internamente comprueba la conexión a la base para readiness, pero no expone ese detalle ni comprueba disponibilidad continua del AD. El login/revalidación LDAP fallan cerrado cuando corresponde. Los contenedores se reinician tras fallo de proceso, pero `unhealthy` requiere diagnóstico; no se añade un sistema externo de reinicio/monitorización.

Si se utiliza una instalación rootless/userns-remap/SELinux, adaptar permisos/bind labels al host y verificar preflight; no resolver errores de permisos haciendo públicos datos o secretos.

## 6. Acceso administrativo y validación institucional

1. Entrar por HTTPS con una cuenta institucional real. La pertenencia al grupo AD `Domain Admins` (membresía directa o grupo primario RID 512) sincroniza el rol `ADMIN`. Las cuentas del grupo `Domain Users` y las demás reciben `USER`, salvo un rol `TECHNICIAN` ya establecido; `Domain Users` no otorga acceso administrativo. Por defecto se busca `CN=Domain Admins,CN=Users,<AD_BASE_DN>`; si el grupo está en otra ubicación, configurar `AD_DOMAIN_ADMINS_GROUP_DN` con su DN comprobado. No se consulta el nombre visible del usuario ni se modifica Active Directory. No hay registro público ni bootstrap HTTP.
2. `SUPER_ADMIN` es una elevación separada y manual, que no procede de grupos AD y no se puede asignar desde la web. Después de que la persona de confianza haya iniciado sesión una vez, en consola autorizada ejecutar:

```bash
./infra/scripts/compose.sh exec api node dist/scripts/promote-super-admin.js --username "$INSTITUTIONAL_USERNAME"
```

La CLI muestra la identidad/proveedor y exige confirmar exactamente el username. Registra auditoría, revoca sesiones y exige volver a iniciar sesión. Para un checkout no contenedorizado: `pnpm --filter api superadmin:promote --username "$INSTITUTIONAL_USERNAME"`.

3. `ADMIN` administra departamentos, categorías y el estado público de servicios. Solo `SUPER_ADMIN` puede administrar usuarios/roles/activación, consultar auditoría, ver la bandeja interna completa, tableros privados y notas internas de servicios. Los técnicos mantienen acceso limitado por departamento y pertenencia explícita a tableros.
4. Volver a iniciar sesión y validar permisos con una cuenta ADMIN común, otra TECHNICIAN y la cuenta SUPER_ADMIN: rutas/API sensibles deben denegar ADMIN común; el usuario sigue limitado a sus propias solicitudes.
5. Reiniciar/recrear servicios y comprobar que se conservan los datos. Cerrar sesión y comprobar que ya no accede con la cookie anterior. Validar restricciones de red desde fuera de LAN/VPN.

Estos pasos necesitan AD y red reales: **no se marcan completados por un health 200 local**.

## 7. Copias y restauración

[Guía de copias/restauración](backup-restore.md). Antes de cualquier actualización se exige respaldo y prueba de recuperación; no copiar únicamente university.sqlite mientras WAL escribe. Los backups incluyen datos personales/hashes de sesiones: permisos 0600, almacenamiento protegido y copia fuera del servidor conforme a política institucional. No hay una web de backups ni una política de borrado automática.

## 8. Parada, actualización y rollback

```bash
./infra/scripts/compose.sh stop
./infra/scripts/compose.sh start
```

Actualización planificada:

1. Registrar etiqueta/IDs de imágenes actuales y copia de configuración/CA en custodia segura, sin publicarlas. Obtener release revisado; no ejecutar `git reset --hard` ni eliminar datos locales para actualizar.
2. Generar respaldo consistente y verificar su restauración en una instalación aislada. Detener entrada y API durante cambio.
3. Cambiar `RELEASE_TAG` a una etiqueta nueva, construir y validar configuración. Mantener imágenes previas.
4. `./infra/scripts/compose.sh up -d --wait --build`; comprobar salud, login real, WebSocket, datos y permisos. No escalar API.

Si una migración falla: no continuar con operaciones, conservar logs sin secretos y copia previa; corregir o restaurar en ventana de mantenimiento. Para rollback de esquema/datos: parar Caddy/API, restaurar copia compatible y desplegar la imagen anterior, no solo cambiar binario sobre un esquema más nuevo sin revisión.

`down` sin `-v` preserva bind mounts/CA; **no ejecutar `down -v`** como operación normal. Nunca borrar data, .university.lock o archivos WAL para "arreglar" un arranque. Un kernel lock real se libera al cerrar el proceso, incluso tras caída; el archivo vacío puede permanecer y es normal.

## Referencias oficiales

[Docker: redes Compose](https://docs.docker.com/compose/how-tos/networking/), [Docker: permisos del daemon](https://docs.docker.com/engine/install/linux-postinstall/), [Caddy: HTTPS local](https://caddyserver.com/docs/automatic-https#local-https), [Caddy: proxy y WebSockets](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).
