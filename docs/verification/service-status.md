# Verificación local · Estado de servicios · 2026-11-08

## Alcance y aislamiento

Node 26.13.0 del proyecto. API de revisión en `127.0.0.1:3111`, frontend en
`localhost:5178`, SQLite privada `/tmp/pizzara-services-qa/review.sqlite` creada
con SQLite Online Backup desde la base local. Sesiones reales de cuentas locales
ya registradas, con roles ADMIN, USER y TECHNICIAN. Se crearon registros de
revisión exclusivamente en esta copia; no son semillas de la aplicación.
No se usaron credenciales AD, mocks de directorio ni datos institucionales.

Se identificaron los puertos/procesos antes de arrancar. No se detuvieron ni se
reconfiguraron los procesos del usuario en 3000/5173. Los reinicios de rol usaron
solo la API propia de revisión, comprobando su `DATABASE_URL` antes de detenerla.

## Persistencia

- Migración `0008_ancient_ricochet.sql` generada con Drizzle y revisada: dos tablas,
  un FK nullable e índice de servicio por ticket, sin recrear tickets/eventos.
- Aplicación y repetición idempotente en la copia aislada antes de aplicarla local.
- Antes de migrar la base habitual: copia consistente Online Backup, conservada
  privada e ignorada en `apps/api/backups/pre-services-20261108.sqlite` (0600).
- Integridad `ok`, `foreign_key_check` sin filas en ambas bases.
- Base habitual tras la migración: cero servicios, cero notas de servicio y cero
  vínculos de revisión. Los tickets anteriores permanecen sin servicio asignado.
- Tras recarga real, solicitudes y vínculos seguían presentes en la copia.

## Flujos y permisos HTTP reales

| Caso | Resultado observado |
| --- | --- |
| ADMIN alta de servicio desde formulario | 201, inicialmente UNKNOWN |
| ADMIN cambio de estado con Select shadcn | 200 y persistencia |
| Nombre duplicado `Proxy` / `pRoXy` | 409 |
| Estado fuera de enum | 422 |
| PATCH sin CSRF | 403 |
| PATCH solo descripción | Conserva estado/fecha del estado |
| Editor de descripción inspeccionado en la red | Envía solo `description`, no reescribe `status` |
| ADMIN alta de nota PUBLIC e INTERNAL desde UI | Persisten con su visibilidad |
| Nota pública más antigua que una interna nueva | Tarjeta muestra únicamente la pública del servicio correcto |
| USER/TECHNICIAN GET/POST administración/notas internas | 403 |
| GET público aun con sesión ADMIN | Solo notas PUBLIC, sin autor/clave interna |
| Nota de otro servicio en DELETE | 404; no se borra |
| ADMIN eliminación de nota | 200; auditoría, servicio/tickets conservados |
| Listado `limit=2&page=2`, filtro de estado | Paginación/filtro SQL con total real |
| Solicitud desde ficha del servicio | Alta real con servicio preseleccionado y FK persistido |
| Propietario cambia servicio desde detalle | 200 y persistencia tras recarga |
| Usuario consulta/modifica vínculo de ticket ajeno | 404 |
| USER usa endpoint staff | 403 |
| Técnico del departamento no responsable | Lectura 200; mutación 403 |
| Técnico responsable tras asignación administrativa | Vincular/desvincular 200 |
| Técnico de otro departamento | 404 |
| Servicio archivado | Desaparece del catálogo/notas públicas; relación anterior legible |
| Nuevo vínculo o alta de ticket con servicio archivado | 409 |
| Restauración de servicio | Vuelve al catálogo y admite vínculo |
| Ticket cerrado, cambio de servicio USER/ADMIN | 409 en ambos canales |
| GET catálogo/notas/vínculo, USER y ADMIN | No cambia `last_seen_at` ni `expires_at` |

La inspección visual detectó que Drizzle descalificaba una referencia de columna
en la subconsulta correlacionada de la vista previa, devolviendo `null` aunque
existía una nota pública. Se corrigió con identificador SQL estático calificado.
Se volvió a comprobar por HTTP y Chromium con una nota interna más reciente:
solo aparece la PUBLIC del servicio correcto; los demás servicios sin notas
siguen con `null`. No se interpolan entradas de usuario en ese SQL estático.

## Navegador y accesibilidad práctica

Chromium real, escritorio 1440×1000 y móvil 375×812:

- Sidebar/rutas por rol y ausencia de acciones administrativas para USER/TECH.
- Crear/editar servicios, seleccionar estado, añadir notas públicas/internas,
  eliminar nota con confirmación, archivar, filtrar archivados y restaurar.
- Solicitud nueva desde ficha, cambio de servicio en detalle y recarga.
- Búsqueda combinada con estado y recuperación de filtros por URL tras recarga;
  `?service=<id>` abre la ficha directamente.
- Apertura de editor con Enter, Select con teclado y cancelación sin modificar.
- Ficha con notas internas diferenciadas para ADMIN; usuario no recibe su texto.
- Sin errores JavaScript en las verificaciones ADMIN/USER registradas.
- Catálogo, tarjeta, ficha y vínculo móvil sin desbordamiento horizontal del documento.

[Catálogo escritorio](service-status/catalog-desktop.png) ·
[Notas administrativas](service-status/notes-admin.png) ·
[Tarjeta móvil](service-status/card-mobile.png) ·
[Notas móviles](service-status/notes-mobile.png).

## Compilación y contrato

`pnpm typecheck`, `pnpm build`, `git diff --check` correctos.
Lint sintáctico OpenAPI: `{ "violations": [] }`.
Colección nueva: `No issues found. Scanned: 14 | Errors: 0 | Warnings: 0`.
Persisten los avisos no fatales PURE de Zod y bundle Vite >500 kB
(~1023 kB JS minificado / 317 kB gzip en esta compilación); no se afirma optimización.

Colección manual generada desde el subconjunto del contrato v1.10 y adaptada a
cookie jar real, sin login ni publicación cloud. Se ejecutó **solo la carpeta
pública `services`**: lista, detalle y notas con sesión USER e ID real aislado.
No se ejecutaron las 14 peticiones de forma indiscriminada.

Primero se intentó seleccionar una petición por ruta de archivo con `-i`; la CLI
no encontró ese identificador: `Error: The following items were not found in the
collection: services/Listar servicios publicados.request.yaml` (0 peticiones,
0 aserciones ejecutadas). Se corrigió seleccionando la carpeta `-i services`.
El aviso de CLI sin login Postman no impidió la ejecución local con cookie real.
La última salida de ejecución fue:

```text
No authorization data found. Please use the `postman login` command.
Refer:https://learning.postman.com/docs/postman-cli/postman-cli-options/#postman-login

Running your collection...
postman

University services

Folder services
Sub-folder Listar servicios publicados

  GET http://localhost:3111/api/v1/services?page=1&limit=20 [200 OK, 2.5 KB, 11 ms]
  Pass  HTTP 200
  Pass  Respuesta con data

Folder {id}
Sub-folder Consultar servicio

  GET http://localhost:3111/api/v1/services/4df6473a-2798-44c5-8e28-e009972027f2 [200 OK, 1.33 KB, 3 ms]
  Pass  HTTP 200
  Pass  Respuesta con data

Sub-folder Historial de notas del servicio

  GET http://localhost:3111/api/v1/services/4df6473a-2798-44c5-8e28-e009972027f2/notes?page=1&limit=20 [200 OK, 1.14 KB, 4 ms]
  Pass  HTTP 200
  Pass  Respuesta con data
  Pass  Solo notas publicas

-------------------------------------------------------------------
|                         |          executed |            failed |
--------------------------+-------------------+--------------------
|              iterations |                 1 |                 0 |
--------------------------+-------------------+--------------------
|                requests |                 3 |                 0 |
--------------------------+-------------------+--------------------
|            test-scripts |                 3 |                 0 |
--------------------------+-------------------+--------------------
|      prerequest-scripts |                 0 |                 0 |
--------------------------+-------------------+--------------------
|              assertions |                 7 |                 0 |
-------------------------------------------------------------------
| total run duration: 249 ms                                      |
-------------------------------------------------------------------
| total data received: 2.33 KB (approx)                           |
-------------------------------------------------------------------
| average response time: 6 ms [min: 3 ms, max: 11 ms, s.d.: 3 ms] |
-------------------------------------------------------------------
```

Los scripts efímeros de navegador también necesitaron dos correcciones de
selectores de QA (opción duplicada durante cierre del Select y rol `searchbox`
en vez de `textbox`); las ejecuciones posteriores terminaron correctamente.
No se incorporaron suites automatizadas ni CI/CD al proyecto.

## Límites

Estados manuales informados por ADMIN, no pruebas de disponibilidad de Proxy,
Correo, Rein, Umcc, Sigenu u otros servicios reales. No se creó infraestructura,
no se desactivó TLS ni se tocó AD/firewall. Sin despliegue institucional, login
AD real, reconstrucción Docker ni validación desde LAN/VPN en esta ronda.
La comunicación del catálogo usa HTTP/reconciliación cada 30 segundos, no una
nueva señal WebSocket. El chat mantiene su transporte existente.

## Cierre de la revisión

Procesos propios 3111/5178 detenidos y archivos de sesión/cookie jar efímeros
eliminados. Procesos habituales del usuario intactos: health API 3000 y frontend
5173 respondieron 200 al cierre. Esto no acredita infraestructura institucional.
No se hicieron commits ni push; se conservaron los cambios previos del checkout.
