# Copias consistentes y recuperación

Solo procedimientos operativos, sin módulo web, colas ni sistema de backup externo obligatorio. La universidad define periodicidad, retención, cifrado y custodia fuera del servidor; no se borran copias automáticamente.

## Copia online

Con la API en ejecución:

```bash
./infra/scripts/compose.sh exec -T api node dist/scripts/backup.js
```

O elegir un nombre **nuevo** dentro del volumen de backups:

```bash
./infra/scripts/compose.sh exec -T api node dist/scripts/backup.js --output /backups/copia-previa-actualizacion.sqlite
```

En desarrollo sigue disponible:

```bash
pnpm --filter api db:backup --output /ruta/privada/copia-nueva.sqlite
```

Usa SQLite Online Backup API de better-sqlite3, no copia en bruto del archivo principal. Conserva una imagen consistente aun con WAL/actividad. La salida se publica solo tras `integrity_check` correcto y cero errores de claves foráneas; archivo 0600 y nombre no sobrescribible. Los temporales se limpian en caso de fallo. No se crean bases vacías si no existe el origen.

Guardar el path que imprime, versión del software y hora; comprobar tamaño/espacio. Transferir la copia **terminada** a almacenamiento protegido externo según política institucional. Contiene datos personales, hashes de sesiones y, si es desarrollo, hashes Argon2id. No subir a Git ni adjuntar a tickets. Un archivo existente con el mismo nombre provoca error; no utilizar `--force` ni borrar la copia anterior para repetir.

En arranque con migraciones pendientes, el entrypoint utiliza este mismo mecanismo y aborta antes de migrar si no puede respaldar. No hace una copia en cada reinicio sin cambio de esquema. Las migraciones se mantienen versionadas y nunca se sustituyen por `drizzle-kit push`.

## Restauración offline y protegida

**Requiere ventana de mantenimiento.** No ejecutar contra la base principal solo para probar; ensayar primero en instalación aislada. Verificar versión compatible del esquema/imagen. Si el servidor está dañado o la base original falla integridad, preservar todos sus archivos y pedir recuperación administrativa antes de reemplazarla; el procedimiento seguro no destruye una base corrupta para poder avanzar.

1. Tener la copia verificada en `BACKUP_DIRECTORY` del host, accesible por UID 1000, permisos 0600. Registrar nombre real; nunca inventar uno ni sobrescribir un respaldo.
2. Detener entrada y API (web puede permanecer):

```bash
./infra/scripts/compose.sh stop caddy api
```

3. Sustituir únicamente el nombre de copia por uno existente y ejecutar:

```bash
./infra/scripts/compose.sh run --rm --no-deps api \
  node dist/scripts/restore.js \
  --from /backups/NOMBRE_REAL_DE_LA_COPIA.sqlite \
  --confirm /data/university.sqlite
```

El entrypoint adquiere **el mismo flock exclusivo** que usa la API. Si sigue una instancia operativa, falla con código 75 sin tocar los datos. No resolverlo borrando .university.lock ni pasando directamente variables internas; cerrar la instancia correcta. El archivo de bloqueo permanece por diseño y el kernel libera el lock cuando muere el proceso.

La CLI exige confirmación exacta del destino, comprueba integridad/FKs, rechaza identidades locales en producción y construye una base temporal. **Revoca todas las sesiones restauradas** y añade auditoría DATABASE_RESTORED antes de instalarla. Si existe base previa, crea primero otra copia consistente `before-restore-*`. Solo con el bloqueo y conexiones cerradas retira sidecars WAL/SHM antiguos y renombra el archivo nuevo; nunca hacerlo con la aplicación escribiendo.

No admite ejecución directa mediante `pnpm db:restore` sin la protección del entrypoint; ese comando muestra el requisito y no restaura. No es un endpoint HTTP ni admite parámetros desde la web.

4. Levantar y revisar:

```bash
./infra/scripts/compose.sh up -d --wait
./infra/scripts/compose.sh ps
./infra/scripts/compose.sh logs --tail=100 api
```

5. Iniciar sesión institucional de nuevo. Verificar conteos, referencias, ticket conocido, historial, tablero/posiciones, notificaciones y permisos. Cookies emitidas antes de la restauración deben fallar. Un health 200 por sí solo no demuestra recuperación de negocio.

Las migraciones pendientes se aplican de nuevo al arrancar (con respaldo previo si corresponde). Para volver a una versión antigua, seleccionar también su imagen/configuración compatible; no asumir que un binario antiguo entiende un esquema más reciente.

## CA web y configuración

SQLite no contiene certificados/secretos ni la CA web de Caddy. Respaldar aparte y bajo custodia: `production.env`, secreto AD, certificados/clave web y volúmenes Caddy. No enviar claves de CA a clientes: distribuir solo la raíz pública. Cambiar o perder la raíz de Caddy exige redistribuir confianza.

Referencia: [SQLite Online Backup API](https://www.sqlite.org/backup.html). No copiar solo university.sqlite durante escrituras WAL.
