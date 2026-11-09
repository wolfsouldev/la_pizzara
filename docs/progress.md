# Registro de implementación

**Alcance vigente: FASE 7**, autorizada expresamente por el usuario tras finalizar fase 6. Se conserva la entrada local sin escribir credenciales. No avanzar a fase 8 ni posteriores. Los registros de fases anteriores son históricos; sus límites no describen el estado actual.

Sin mocks, cuentas predefinidas, suites de tests ni CI/CD. Las verificaciones se registran con evidencia real, sin confundir compilación con uso validado.

## Fase 0 — configuración
- `.env.example`: desarrollo local, SQLite, sesiones, LDAP, tiempos y proxy explícitos.
- `docs/active-directory.md`: preparación administrativa externa; ningún dato institucional inventado.
- URL local web: http://localhost:5173. API: http://127.0.0.1:3000/api/v1. Vite proxifica `/api` para cookies de mismo origen.
- SQLite: `apps/api/data/university.sqlite` por defecto. Producción: ruta absoluta en volumen local.
- Producción exige LDAP cifrado, certificados verificados, origen HTTPS y SQLite en archivo persistente.

## Fase 1 — registro histórico de la primera entrega

### Backend y persistencia
- NestJS modular con Express, TypeScript estricto, `@nestjs/config` y validación de entorno con Zod.
- Prefijo `/api/v1`, errores uniformes, interceptor de respuestas y pipe global Zod para DTOs con esquema estático.
- `GET /api/v1/health` consulta realmente SQLite a través de Drizzle; no es una respuesta simulada.
- Conexión única `better-sqlite3`, WAL, claves foráneas y `busy_timeout=5000`.
- Drizzle Kit configurado; primera migración técnica generada y versionada en `apps/api/drizzle`.
- Swagger disponible en desarrollo en `/api/docs`; únicamente documenta salud.

### Frontend y compartido
- React/Vite/TypeScript estricto, Tailwind 4, componente Button de shadcn/ui con Radix, Router y TanStack Query.
- Cliente HTTP maneja errores de red, JSON inválido y envolturas incorrectas; el estado de salud valida el contrato Zod compartido, no solo HTTP 200.
- Login inicial responsive claramente deshabilitado; no envía credenciales.
- Layouts App/Staff/Admin preparados. Los layouts internos no se montan como supuestos paneles públicos.
- Enums globales, tipos de respuesta/paginación y esquemas Zod reutilizables en `packages/shared`.
- Dependencias resueltas registradas en `pnpm-lock.yaml`; Node 24 LTS fijado para el proyecto.

### Comprobaciones ejecutadas (2026-11-03, America/Havana)
- `pnpm install --frozen-lockfile`: correcto usando Node 24.15.0 LTS.
- `pnpm build`: los tres paquetes compilan. Avisos no bloqueantes de comentarios `@__PURE__` de Zod/Rollup; no se ocultaron.
- `pnpm typecheck`: correcto en API, web y compartido.
- `pnpm --filter api db:generate`: migración creada; segunda ejecución sin cambios de esquema.
- `pnpm --filter api db:migrate`: aplicada y repetida sin duplicados; una entrada en `__drizzle_migrations`.
- SQLite reabierto independientemente: `integrity_check=ok`, `journal_mode=wal`. Conexión del servicio: `foreign_keys=1`, `busy_timeout=5000`.
- `pnpm dev`: arranque conjunto correcto; compiladores watch sin errores.
- API directa y a través del proxy Vite: HTTP 200 y `{"data":{"status":"ok","database":"connected"}}`.
- Swagger JSON contiene exclusivamente `/api/v1/health`.
- `POST /api/v1/auth/login`: HTTP 404; confirma que no se ha dejado autenticación de fase 2.
- Configuración inválida de puerto y modo producción con proveedor local: arranque rechazado con salida no cero.
- Chromium real: login y conexión comprobados visualmente a 1440×1000, 768×1024 y 390×844; capturas en `docs/verification`.
- Petición local Postman de salud: 200, un request correcto, cero scripts y cero assertions. No constituye una suite ni prueba módulos de negocio. Sin envío de eventos (`--no-report-events`).

### Límite de aquella entrega (superado por la autorización de fase 2)
En aquella entrega no se habían implementado autenticación local/LDAP, sesiones, Guards, usuarios, departamentos, tickets, tareas, notificaciones, dashboards o Docker. Se retiró el código de fase 2 iniciado antes de la acotación del usuario. La petición posterior autorizó la fase 2 registrada a continuación.

## Fase 2 — registro histórico, implementada y validada localmente

### Identidad, persistencia y seguridad
- Migración Drizzle `0001_identity_sessions`: usuarios, contraseñas locales, sesiones y auditoría. Restricciones de proveedor/rol e índices únicos de identidad. Fechas UTC en milisegundos.
- Departamentos y pertenencias únicamente como almacenamiento de lectura necesario para `/auth/me`, sin endpoints/pantallas de administración ni categorías (fase 3).
- Proveedores intercambiables: local con Argon2id; LDAP con dos conexiones LDAPS verificadas, escape de filtros, coincidencia única, GUID canónico estable, cuenta deshabilitada y cierre en `finally`.
- Perfiles LDAP sincronizados por GUID, conservando privilegios y pertenencias. Revalidación periódica por cuenta de lectura y denegación ante indisponibilidad vencida.
- Sesiones SQLite, hashes únicamente, cookies HttpOnly/Lax, rotación, límites de inactividad/absoluto, logout y revocación en promoción.
- CSRF de prelogin y sesión, verificación estricta de Origin, TLS obligatorio en producción, proxy de confianza limitado a IP/CIDR explícitos y rate limit.
- `SessionGuard` y `RolesGuard` globales; decoradores de roles/usuario/ruta pública. Rutas de acceso protegidas para demostrar permisos sin simular dashboards.
- CLI de alta local (`USER`) y promoción a `ADMIN`, con identidad visible, confirmación explícita, auditoría y revocación. Sin registro público ni bootstrap por HTTP.
- Producción rechaza `AUTH_PROVIDER=local`, acceso sin contraseña, origen HTTP, base no persistente y una base que contenga identidades locales.

### Entrada para mirar y frontend conectado
- Botón **Entrar en desarrollo**, parametrizado y apagado por defecto en `.env.example`. Requiere cuenta activa previamente registrada por CLI, development/local y loopback. No elimina permisos del backend.
- En esta máquina: `.env` ignorado habilita la cuenta real de desarrollo `desarrollo`; registrada con contraseña aleatoria, luego iniciada y promocionada mediante CLI a ADMIN. Sin contraseñas por defecto ni semillas en el repositorio.
- Login por credenciales conectado con React Hook Form/Zod, manejo de errores, validación del DTO y CSRF en memoria (nunca token de sesión en localStorage).
- Perfil real con identidad, rol, fechas de sesión y consulta de pertenencias. Layouts y redirecciones por rol a perfiles; no a tickets/dashboard inexistentes.
- Rutas privadas protegidas, logout y limpieza de datos privados; página de permiso denegado y comprobaciones administrativas/de atención conectadas a NestJS.
- Corregido durante la comprobación visual: `QueryClient.clear()` desconectaba observadores y dejaba visible el perfil tras logout. Se conserva la consulta observada de sesión y se cambia a null; los demás datos se retiran y los Guards desmontan el contenido.
- Errores de JSON malformado se responden genéricamente sin registrar ni devolver fragmentos de credenciales.

### Comprobaciones manuales realizadas (2026-11-03, America/Havana)
- Respaldo consistente de la SQLite anterior mediante Online Backup API antes de migrar; fuera del repositorio, permisos restrictivos.
- `pnpm build` y `pnpm typecheck`: correctos con Node 24 LTS. Avisos no bloqueantes de anotaciones Zod y bundle web >500 kB, sin ocultarlos.
- `db:migrate`: aplicado y repetido sin duplicados. `db:generate`: sin cambios posteriores. Dos migraciones registradas, `integrity_check=ok`.
- Alta CLI real con contraseña fuerte; verificación de hash Argon2id y almacenamiento de sesión solo por hash SHA-256 (no token original).
- Login local por credenciales, fallo de credenciales, entrada sin contraseña, rotación de cookie, sesión consultable y persistencia tras reinicio watch de API.
- Sin sesión: `/auth/me` y acceso administrativo 401. Como USER antes de promoción: acceso administrativo/de atención 403. Tras promoción por CLI: sesiones anteriores 401; nueva sesión ADMIN y ambos accesos 200.
- Origen incorrecto y CSRF ausente/inválido: 403. Logout correcto: 204; cookie anterior rechazada con 401.
- Caducidades de inactividad y absoluta: 401, comprobadas con ajustes temporales acotados de la sesión en SQLite y restauración de sus fechas originales.
- Entrada deshabilitada en una API temporal: disponibilidad false y endpoint 404. Límite de peticiones: 429 tras superar el umbral; API temporal detenida.
- Configuración de producción local, entrada de desarrollo en producción, LDAP plano, bypass TLS y publicación de entrada sin credenciales en 0.0.0.0: rechazados.
- JSON malformado: 400 con mensaje genérico, sin fragmentos del cuerpo en respuesta.
- Chromium real: entrada sin credenciales → `/admin/profile`, datos reales, recarga conserva sesión, comprobación administrativa y logout → login. Navegación posterior al perfil sin sesión redirige al login.
- Inspección visual desktop/tablet/móvil (1440×1000, 768×1024, 390×844). Capturas `docs/verification/phase2-*.png`.
- OpenAPI: lint de sintaxis correcto. Colección v3: `Scanned: 8 | Errors: 0 | Warnings: 0`.
- Ejecución local Postman (sin eventos cloud): salud 200 y CSRF 200. Resultado literal resumido: `iterations 1/0 failed; requests 2/0 failed; test-scripts 0; prerequest-scripts 0; assertions 0`. No equivale a una suite de seguridad; los flujos anteriores se comprobaron separadamente contra la API real.
- CLI Postman 1.76 no dispone de `postman status`; governance lint exige login. Se utilizó únicamente lint de sintaxis local y no se publicaron recursos.

### Pendiente externo / no verificado
- Login y revalidación contra Active Directory real: faltan certificados, LDAPS habilitado, FQDN, DN, cuenta de lectura y conectividad. No se ha simulado el directorio ni relajado TLS.
- No se validó cookie Secure mediante HTTPS institucional, red LAN/VPN ni contenedores: corresponden al despliegue posterior.
- Sin fase 3: no gestión de departamentos/categorías/usuarios, tickets, tableros, notificaciones, dashboards o Docker. Los permisos de recursos de esos módulos se añadirán junto con ellos.

## Fase 3 — registro histórico: organización y administración de usuarios

### Entregado
- Contrato OpenAPI ampliado antes de implementar: CRUD lógico de departamentos/categorías, miembros, usuarios, catálogos y auditoría. No se añadieron rutas de fases posteriores.
- Migraciones `0002_organization_categories.sql` y `0003_membership_lookup.sql`: categorías con FK y slug único por departamento; índice de pertenencias por usuario. Sin semillas ni modificación de identidades institucionales.
- Repositorios por entidad (`departments`, `categories`, `users`, `audit`); servicios NestJS de negocio y controladores con Zod, SessionGuard y rol ADMIN. `DepartmentAccessPolicy` distingue gestión administrativa y lectura por pertenencia.
- Unidad de trabajo transaccional para cambios + auditoría. La regla del último administrador activo y la revocación de sesiones se ejecutan dentro de una transacción de escritura inmediata, no mediante un simple check en React.
- Departamentos: crear/editar/activar/desactivar; miembros técnicos activos, duplicados rechazados y retirada con confirmación. Desactivar no elimina categorías, usuarios ni relaciones.
- Categorías: crear para departamento activo; editar datos/activación; departamento inmutable para conservar identidad histórica. Catálogos autenticados devuelven solamente departamentos activos y categorías activas con padre activo.
- Usuarios: búsqueda por nombre/usuario/correo, filtros por rol/activación, detalle seguro y pertenencias, cambios de rol y activación local. No se devuelven hashes, GUID externos ni contraseñas. Sin registro público, alta AD, eliminación de usuarios ni cambios de contraseña del dominio.
- Cambios reales de rol/activación revocan todas las sesiones afectadas. No se permite desactivar o degradar al último ADMIN activo ni convertir a USER a un técnico que conserve pertenencias.
- Auditoría paginada, consultable solo por ADMIN, con actor y metadatos reducidos, sin secretos.
- Interceptor paginado conserva `{data: [], meta}` sin doble envoltura; demás endpoints conservan `{data}`. Búsquedas parametrizadas y comodines tratados literalmente.
- UI conectada en `/admin/departments`, `/admin/categories`, `/admin/users`, `/admin/audit`; navegación lateral, formularios RHF/Zod, filtros/paginación, estados vacíos, errores, reintentos y confirmaciones.
- Se mantienen login, perfil, permisos, logout y botón local de fase 2. No se modificó AD ni la configuración TLS.

### Verificación realizada (2026-11-03, America/Havana)
- Antes de migrar: respaldo consistente con Online Backup API, permisos 0600, fuera del repositorio.
- `pnpm build` y `pnpm typecheck`: correctos. Se mantienen avisos no bloqueantes de anotaciones Zod/Rollup y bundle web >500 kB.
- Migraciones aplicadas y reaplicadas sin duplicados; `db:generate` final sin cambios. Base nueva migrada desde cero: 4 migraciones, 0 usuarios, 0 departamentos, 0 categorías. No hay seeds.
- Base de trabajo y base limpia: `integrity_check=ok`, `foreign_key_check` sin errores. Perfiles y datos de las fases anteriores conservados.
- Comprobación HTTP contra API real: alta y edición de departamento/categoría, pertenencia y retirada de técnico, filtros/paginación, proyecciones seguras, desactivación/reactivación y conservación de relaciones.
- ADMIN crea; USER y TECHNICIAN reciben 403 en administración; sin sesión 401. Auditoría vedada a no administradores. UUID inválido/atributos desconocidos/límite >100: 422; recurso ausente: 404; duplicados y reglas de integridad: 409; CSRF incorrecto: 403.
- Último admin: intentos de degradación y desactivación rechazados, sin perder acceso. Cambiar USER a TECHNICIAN invalida su sesión anterior; desactivar invalida sesión y login; reactivar conserva las pertenencias.
- Departamento inactivo oculta sus categorías en catálogo y rechaza nuevas categorías. Desactivar categoría la oculta sin eliminar su registro. Reactivación recupera visibilidad.
- Encontrado y corregido durante verificación: un escape SQL escrito en un template literal se convertía en expresión vacía y rompía búsquedas con 500. Se parametriza el carácter de escape. Búsquedas por nombre/usuario/categoría/acción vuelven a 200 y `%` literal devuelve cero coincidencias en los datos locales actuales.
- Chromium real: crear y editar departamento y categoría desde formularios; incorporar y retirar miembro; cambiar rol y restaurarlo; desactivar/reactivar usuario y categoría; consulta de detalle y auditoría; error de último admin visible; búsqueda y recarga conservan datos; logout vuelve a login.
- Capturas revisadas desktop, tablet y móvil en `docs/verification/phase3-*.png`. Las tablas anchas tienen scroll interno.
- Datos introducidos durante esa comprobación son entidades reales de la base **local de desarrollo**, no información institucional: dos departamentos, dos categorías y cuentas CLI `tecnico-local`/`usuario-local`, además del admin local previo. No se agregan automáticamente al instalar.
- Contrato: lint OpenAPI de sintaxis correcto. Colección Postman v3: 25 requests, 0 errores/advertencias. Sin ejemplos ficticios, scripts de tests ni publicación cloud.
- Postman local: salud/CSRF 2 peticiones 200; segunda ejecución con cookie jar privado de sesión real: departamentos, categorías, usuarios y auditoría, 4 peticiones 200, 0 fallos, 0 test-scripts, 0 prerequest-scripts y 0 assertions. La primera selección de la auditoría usó un nombre de item inexistente y no ejecutó solicitudes; se corrigió la ruta del item y se repitió correctamente. El cookie jar temporal fue revocado y retirado.
- `postman skills update` no pudo alcanzar el repositorio (ETIMEDOUT); se releyó la guía local instalada. `postman status` no está disponible en CLI 1.76. No se solicitó login ni se publicaron artefactos.

### Límites y siguiente fase
- No se comenzó fase 4: no existen tickets/asignaciones aún. La restricción adicional de retirar pertenencias con tickets asignados deberá integrarse al añadir ese modelo; esta fase no crea tablas o consultas ficticias de tickets para aparentarlo.
- No existen Kanban, notificaciones, dashboards o Docker; quedan para sus fases autorizadas.
- LDAP sigue implementado pero pendiente de conexión y comprobación con el dominio real; faltan los datos/certificados externos indicados en `docs/active-directory.md`.

## Fase 4 — portal del solicitante

### Entregado
- Contrato OpenAPI ampliado antes de implementar: alta de ticket, listado propio, detalle e historial público paginado, comentarios públicos, cierre y reapertura. Estados HTTP y esquemas compartidos documentados.
- Migración `0004_requester_tickets.sql`: tickets, contador, comentarios, eventos y notificaciones. FK e índices explícitos, CHECK de estados/prioridades/visibilidad/eventos y números positivos. Ninguna semilla ni ticket de ejemplo al migrar.
- Numeración correlativa por actualización SQL atómica del contador dentro de una transacción inmediata; no se calcula mediante MAX fuera de la transacción. El UUID sigue siendo el identificador técnico.
- `TicketsRepository`, `TicketsService`, `TicketsController` y `TicketAccessPolicy`. Listas, detalles, comentarios e historial aplican alcance de solicitante en SQL; incluso ADMIN recibe 404 en el portal público si no es propietario.
- Crear deriva `requesterId` de sesión y `departmentId` de categoría activa con padre activo. Campos extra como solicitante, estado, prioridad o visibilidad interna se rechazan con Zod.
- Evento CREATED y notificaciones a administradores activos pertinentes (excepto el propio actor) en la misma transacción. Solo almacenamiento de esas notificaciones; sin endpoints, pantallas o polling de fase 8.
- Comentarios públicos persistentes y actualización de `updatedAt`. Responder en WAITING_USER pasa a IN_PROGRESS y registra evento en la misma transacción.
- Cierre solo desde RESOLVED; reapertura solo desde RESOLVED, con `resolvedAt` válido y dentro de siete días UTC. Reapertura vuelve a OPEN y limpia resolución/cierre. CLOSED impide comentar, cerrar otra vez y reabrir.
- DTOs públicos explícitos: nunca se extiende la entidad completa, ni se devuelve assignedToId, actor interno, metadatos brutos, notas internas o tareas. La conversación filtra PUBLIC en SQL; su total tampoco incluye notas internas. El historial admite tipos públicos y proyecta únicamente `fromStatus`/`toStatus` válidos, además de tipo/fecha/ID.
- UI React en `/app/tickets`, `/app/tickets/new`, `/app/tickets/:id`, con RHF/Zod, TanStack Query y API real. Número, datos de catálogo, estados/fechas, confirmación de alta, búsqueda/filtros, paginación, conversación, historial y acciones según reglas del backend.
- Estados de carga, vacío, error y recurso no encontrado; mensajes de validación y confirmaciones de cierre/reapertura. Categorías desactivadas durante el formulario se pueden actualizar sin perder título/descripcion. Solicitudes cerradas presentan solo lectura.
- USER abre `/app/tickets` al entrar; otros roles conservan sus áreas y un acceso a sus solicitudes propias. ADMIN puede volver a administración desde el portal. El detalle se remonta al cambiar de ID para no arrastrar borradores entre tickets.
- Componentes de tabla/paginación/mensajes reutilizados desde `components/common/data-view.tsx`; administración conserva sus importaciones públicas anteriores. La unidad transaccional ahora está en `database/unit-of-work.ts`, sin cambiar el driver ni la conexión única.
- Integrada la protección pendiente de fase 3: no se retira una pertenencia con tickets asignados no cerrados de ese departamento. Los cerrados permanecen como historia sin bloquear indefinidamente la salida del técnico.

### Comprobación real (2026-11-03, America/Havana)
- Respaldo consistente previo con Online Backup API en archivo privado fuera del repositorio. Dependencias y lockfile conservados; no se requirió añadir otro stack.
- `pnpm build` y `pnpm typecheck`: correctos en web, API y compartido. Continúan avisos no bloqueantes de Zod/Rollup y tamaño del bundle; no se ocultaron.
- Migración generada, aplicada y reaplicada sin duplicados; `db:generate` posterior sin cambios. Base vacía migrada desde cero: cinco migraciones, trece tablas, sin usuarios/tickets/categorías precargados. Integridad y claves foráneas verificadas.
- Comprobación HTTP en una copia SQLite privada y una API real independiente en loopback: dos cuentas USER creadas por CLI con contraseñas aleatorias y Argon2id, login real, alta, comentarios, filtros, paginación y validaciones. Sin mocks ni archivos de suites de tests en el proyecto.
- Otro USER y ADMIN no propietario: 404 en detalle, comentarios (lectura/escritura), cierre y reapertura. Sin sesión: 401. No se aceptan IDs inválidos, campos privilegiados, estado desconocido o límites >100 (422); CSRF inválido (403); estado/plazo/catálogo incompatibles (409).
- Número inicial correcto y valores OPEN/NORMAL/sin asignación guardados; categoría determina el departamento. Evento y notificación administrativa presentes en SQLite real.
- Ocho altas HTTP concurrentes: ocho números únicos y correlativos. Se forzó un fallo de escritura mediante un trigger temporal exclusivamente en la copia de QA: ticket, contador, evento y notificación retrocedieron juntos; después se retiró el trigger. No se añadió mecanismo de fallo/depuración a la API.
- En esa copia aislada se persistieron estados RESOLVED/WAITING_USER y comentarios PUBLIC/INTERNAL para comprobar los casos que todavía dependen del panel de personal de fase 5. La respuesta pública del personal es visible; la nota interna y un marcador en metadatos nunca aparecen, tampoco en los totales públicos. No son respuestas simuladas del servicio.
- Comentar en WAITING_USER cambia realmente a IN_PROGRESS. Cerrar establece CLOSED/fecha/evento y bloquea nuevas escrituras. Reabrir dentro del plazo funciona; después de siete días o con resolución futura se rechaza; flags del detalle coinciden con las reglas.
- Categoría inactiva o departamento inactivo rechazan altas sin consumir número. Tickets históricos siguen accesibles a su propietario aunque se desactive el catálogo. Guard de retirada de técnico con asignación no cerrada devuelve 409.
- Chromium real sobre la aplicación principal: estado vacío, formulario con departamento derivado, crear una solicitud local, confirmación, comentar, recargar, búsqueda por número, filtro sin resultados, administración anterior y logout. Se conserva en la base de desarrollo un ticket propio del admin local y su comentario, registrados manualmente; no se generan al instalar.
- Chromium real adicional con la misma SPA contra la API/SQLite de QA: login USER redirige al portal, respuesta pública visible sin nota interna, botones RESOLVED, reapertura, cierre con solo lectura, bloqueo de administración y rechazo de ticket ajeno para otro USER. Los estados de personal se prepararon en SQLite aislada, no mediante un endpoint de fase 5.
- Capturas revisadas a 1440×1000, 768×1024 y 390×844 en `docs/verification/phase4-*.png`. Las capturas con prefijo `phase4-qa-` corresponden al entorno aislado, no al despliegue institucional.
- Lint OpenAPI de sintaxis y colección v3 correctos: `Scanned: 32 | Errors: 0 | Warnings: 0`. Se retiraron ejemplos sintéticos del generador y se parametrizaron IDs/cuerpos sin guardar credenciales.
- Postman local con cookie jar privado: salud, lista propia, detalle e historial, comentarios: cuatro GET 200; `iterations 1/0 failed; requests 4/0 failed; test-scripts 0; prerequest-scripts 0; assertions 0`. Esto comprueba lecturas reales, no sustituye las comprobaciones de autorización/escritura anteriores. Sin publicación cloud ni eventos de reporte.
- CLI Postman sigue sin `status`; `skills update --no-fetch` no está disponible en esta versión. Se releyó la guía instalada; no se cambió de versión ni se solicitó login para desarrollar.
- Cierre de comprobaciones: bases principal, limpia y QA con `integrity_check=ok`, cero errores de claves foráneas y cinco migraciones cada una. La base limpia conserva cero entidades precargadas; la principal mantiene tres usuarios, dos departamentos, dos categorías y la solicitud/comentario creados manualmente.
- Sesión temporal de Postman revocada (logout 204 y cookie anterior 401); cookie jar y credenciales temporales retirados. API/SPA de QA y navegador de comprobación detenidos. La aplicación principal permanece disponible: web 200 y salud API 200.

### Límites conservados
- No se comenzó fase 5: no hay bandeja del personal, asignación por HTTP, cambio de prioridad/estado por personal, notas internas por API ni dashboard. No se añadió un botón que finja resolver solicitudes.
- El guard de pertenencia puede validarse con asignaciones preparadas en la copia de QA; las asignaciones normales llegarán con fase 5. No existen tareas ni relaciones de Kanban en las respuestas.
- Las notificaciones de alta están persistidas para integrarse con la UI de fase 8. No se expone una pantalla vacía simulando notificaciones.
- LDAP real y despliegue institucional continúan pendientes de la infraestructura/certificados ya documentados. Entrada local y fases anteriores se mantienen.

## Fase 5 — panel de atención de tickets

### Implementado
- Contrato OpenAPI 1.4 definido antes de la implementación; colección local `University Phase 5`, sin ejemplos sintéticos, scripts ni publicación cloud. Guías Postman locales actualizadas correctamente en esta sesión.
- `StaffTicketsRepository` aplica alcance de departamentos mediante subconsulta SQL en bandeja, detalle, conversación, eventos y estadísticas. ADMIN tiene alcance global; USER no accede al módulo. Filtros por departamento, categoría, estado, prioridad, responsable, sin asignación y búsqueda literal por título/descripción/número. Paginación real 20/100.
- `TicketAccessPolicy` conserva portal propio y añade lectura interna, permisos de edición/asignación y CLOSED de solo lectura. Un técnico lee sus departamentos pero modifica únicamente tickets asignados a él; ADMIN asigna y traslada. Las capacidades y transiciones válidas también se devuelven al frontend.
- Endpoints `/staff/tickets`, `/staff/tickets/options`, detalle, comentarios GET/POST, eventos GET y PATCH de estado/prioridad/asignación/departamento. El endpoint de opciones solo expone catálogos y técnicos del alcance autorizado; no se dio acceso a `/admin/users` a técnicos.
- Primera asignación cambia OPEN a ASSIGNED; desasignar un ASSIGNED vuelve a OPEN. Técnico activo y pertenencia al departamento comprobados dentro de la transacción. Fecha de asignación, evento, auditoría y notificación persistentes.
- Traslado administrativo exige categoría activa del departamento de destino activo y técnico compatible o null; omitir responsable lo elimina. Ajusta OPEN/ASSIGNED si corresponde, sin falsear otros estados. El departamento anterior pierde acceso al instante.
- Transiciones de estados del plan, incluyendo resolución directa administrativa de un ticket pendiente. Resolución/cierre guardan sus fechas; reapertura limpia resolución/cierre. El personal autorizado puede reabrir un RESOLVED; el límite de siete días sigue aplicándose al portal del solicitante.
- Respuestas públicas y notas internas reales, con visibilidad explícita y comentarios paginados. Solicitante ve respuestas públicas y su historial seguro anterior; nunca notas internas, actores internos ni metadatos brutos. Eventos/auditoría no copian cuerpos de mensajes.
- Notificaciones de asignación, respuesta pública y cambio de estado guardadas en la transacción correspondiente; las notas internas no notifican al solicitante. No se implementaron los endpoints, polling ni UI de fase 8.
- Resúmenes `/staff/dashboard` y `/admin/dashboard`: conteos reales de tickets por estado, departamento/prioridad y pendientes sin asignación/asignados al usuario; estos últimos excluyen RESOLVED/CLOSED. No se simulan métricas de tareas aún inexistentes.
- UI `/staff/tickets`, `/staff/tickets/:id`, `/staff/dashboard` y equivalentes ADMIN: filtros, responsable, prioridad, transiciones, reasignación, conversación pública/interna, historial, estados de carga/error/vacío y confirmaciones. Formularios RHF/Zod; datos y mutaciones TanStack Query conectados a la API.
- Inicio del personal redirige al resumen real. Sidebar añade Resumen/Atención de tickets, conserva solicitudes propias y administración anterior. Entrada local de desarrollo conservada.
- Esquemas/restricciones de fase 4 ya cubren esta fase: no se generó una migración vacía ni se añadió otra tecnología/dependencia. Se conserva `pnpm-lock.yaml`.

### Verificación real (2026-11-03, America/Havana)
- Respaldo consistente previo con SQLite Online Backup API, privado fuera del repositorio. Base QA independiente, mismas API/SPA y usuarios creados realmente por CLI con Argon2id; roles y pertenencias gestionados por HTTP administrativo, no por respuestas simuladas.
- `pnpm build` y `pnpm typecheck` correctos. Continúan los avisos no bloqueantes de Zod/Rollup y bundle web >500 kB (~599 kB), no suprimidos.
- `db:generate`: sin diferencias de esquema. `db:migrate` reaplicado sin duplicados. Base limpia migrada desde cero: cinco migraciones, cero usuarios/departamentos/categorías/tickets/comentarios/eventos/notificaciones. Sin seeds.
- Principal, limpia y QA: `integrity_check=ok` y cero errores de FK. Principal conserva tres usuarios, dos departamentos, dos categorías y el ticket/comentario de fase 4; los escenarios de atención se escribieron solo en la copia de QA.
- HTTP real: USER crea y solo consulta su portal; ADMIN asigna; TECHNICIAN responsable inicia, cambia prioridad, responde, añade nota, espera información y resuelve; solicitante responde/reabre/cierra. Sin sesión 401; USER/operación exclusiva administrativa 403; recurso de otro departamento 404, incluidas mutaciones; campos extra/límites inválidos 422; transiciones/asignaciones incompatibles/CLOSED 409; CSRF inválido 403.
- Técnico compañero del departamento puede consultar pero no modificar el ticket de otro responsable. Filtro por departamento ajeno no amplía alcance. Opciones y dashboard tampoco filtran en React: el SQL ya devuelve solo el alcance permitido. Dashboard global coincide con conteo SQLite y está vedado a técnicos.
- Técnico de destino inactivo rechazado; su sesión deshabilitada devuelve 401. No se puede retirar la pertenencia de un técnico con ticket no cerrado asignado. Roles/pertenencias anteriores se conservan al reactivar.
- Traslado con categoría o responsable incompatible rechazado; traslado válido limpia asignación anterior, cambia departamento/categoría y retira acceso al técnico del departamento anterior. Resolución directa administrativa registrada.
- Nota interna guardada sin notificación pública; respuesta pública visible en el portal y notificación del destinatario persistida. Detalle/historial y totales públicos no incluyen la nota ni metadatos internos.
- Rollback comprobado con triggers temporales exclusivamente en la copia QA, retirados en `finally`: fallo de auditoría revierte ticket/evento; fallo posterior al insertar notificación revierte ticket, evento, auditoría y notificación. No se dejó endpoint ni mecanismo de fallo en la aplicación.
- Chromium real QA: asignar, desasignar a null y reasignar; traslado de departamento/categoría/responsable; login técnico y dashboard acotado; iniciar, prioridad, notas y respuestas; solicitante responde, técnico resuelve y solicitante cierra; cierre de solo lectura y ausencia de notas privadas en el portal. Ya no fue necesario preparar estados por SQL: todas las operaciones del flujo se hicieron desde las nuevas pantallas o endpoints reales.
- Corregido durante la inspección visual: los selects con opciones asíncronas podían mostrar el primer departamento aunque React Hook Form conservara el ID real del ticket. Se hicieron controlados por los valores del formulario; recarga directa comprueba departamento/categoría/responsable reales, y cambios de destino limpian categoría/asignación. Repetidas asignación/desasignación y traslados por navegador tras la corrección.
- Chromium sobre entorno principal: botón local entra a `/admin/dashboard`, conteos reales, ticket anterior presente en bandeja, controles administrativos disponibles, departamentos anteriores y logout conservados. Sin modificar los tickets de trabajo para preparar la demostración.
- Capturas revisadas desktop/tablet/móvil en `docs/verification/phase5-*.png`. Prefijo `phase5-qa-` identifica la copia aislada; `phase5-main-` corresponde a la aplicación local principal. No son evidencia de un despliegue institucional.
- Lint OpenAPI de sintaxis correcto; colección: `Scanned: 45 | Errors: 0 | Warnings: 0`. Postman local ejecutó siete GET 200, sin scripts/assertions. El primer intento no ejecutó peticiones por dos rutas de items incorrectas; se corrigieron. Resultado literal y aviso de autorización cloud de la CLI en [verification/phase5-postman.md](verification/phase5-postman.md). No se inició sesión cloud ni se publicó nada.

- Limpieza final: sesión QA/Postman revocada (204), cookie anterior rechazada (401), cookie jar/contraseñas temporales retirados. API y SPA de QA y Chromium detenidos; perfil temporal del navegador eliminado. Se conserva únicamente evidencia y bases privadas de verificación/respaldo fuera del repositorio. La aplicación principal continúa disponible.
- `postman status` final: comando no disponible en CLI 1.76. Salud principal y SPA devuelven 200; entrada local habilitada.

### Límites
- No se comenzó fase 6: sin tableros, tareas, drag-and-drop ni vinculación con tickets.
- Dashboard actual es el resumen básico de tickets de fase 5; métricas de tareas e interfaz/polling de notificaciones permanecen en sus fases autorizadas.
- LDAPS real, certificados y despliegue institucional siguen pendientes de infraestructura externa. No se relajó TLS ni se cambió el mecanismo de sesiones.

## Fase 6 — Kanban interno privado

### Implementado
- Contrato OpenAPI 1.5 definido antes de implementar; 29 operaciones nuevas y colección local `University Phase 6` con 74 peticiones reales, sin datos sintéticos, scripts de tests ni publicación cloud.
- Migración `0005_internal_kanban.sql`: `boards`, `board_members`, `board_columns`, `tasks`, `task_assignees`, `task_comments`, `task_checklist_items` y `task_events`. Esta última añade el historial solicitado, no previsto como tabla en el modelo original. FK compuesta tarea/tablero/columna impide cruces de tableros incluso en persistencia. Fechas UTC ms, checks, índices y referencias explícitas.
- Repositorios `BoardsRepository` y `TasksRepository` concentran consultas Drizzle. Alcance SQL en listados, detalles, comentarios, checklist e historial. ADMIN global; TECHNICIAN requiere pertenencia actual al departamento y al tablero; USER denegado. No se filtra seguridad en React.
- `BoardAccessPolicy` y `TaskAccessPolicy` comprueban VIEW/EDIT/MANAGE en cada solicitud. No basta pertenecer al departamento. Permisos/estado activo se evalúan de nuevo, no se confía en una sesión con privilegios antiguos.
- Servicios NestJS con transacciones `immediate`: crear tablero y cuatro columnas iniciales, configurar/archivar, miembros/permisos, columnas/reordenamiento y tareas. Los responsables deben ser miembros explícitos activos/elegibles, incluso si son ADMIN. VIEW puede ser responsable pero sigue sin permiso de escritura.
- Tareas: título, descripción, prioridad, fecha límite opcional, autor, responsables, comentarios privados, checklist y progreso agregado, historial paginado y archivado. La columna representa su estado; no existe `status` duplicado. PATCH genérico solo acepta campos editables, nunca posición/tablero/columna.
- Movimiento: validar acceso y columna del mismo tablero; índice sobre destino excluyendo la propia tarea; posición entera con huecos de 1024 y normalización si se agota el intervalo; actualización/evento/auditoría atómicos. Respuesta con orden canónico de las columnas afectadas. No se acepta una lista de tareas arbitraria enviada por el cliente.
- Notificaciones de asignación de tarea almacenadas dentro de la transacción, sin cuerpo de comentarios ni datos sensibles en auditoría. Su API, polling, contador y pantalla quedan para fase 8. Esa fase deberá mantener la privacidad de notificaciones internas incluso si cambia el rol del destinatario.
- Retirar miembro revoca acceso y desasigna tareas activas con eventos/auditoría atómicos; conserva responsables históricos de tareas archivadas. Se permite retirar miembros incluso de tableros archivados para revocar accesos. Antes de retirar un técnico de un departamento hay que retirar sus pertenencias a tableros; el guard anterior de tickets asignados sigue vigente.
- Tablero/tarea archivados quedan de solo lectura, salvo esa retirada de miembros por seguridad. Columnas con cualquier tarea, incluidas archivadas, no se pueden eliminar. No se añadió eliminación física histórica ni restauración fuera del alcance.
- React: rutas `/admin/boards`, `/admin/boards/:id` y equivalentes `/staff`; sidebar Tableros; altas, configuración, miembros, columnas, tareas y panel accesible Radix con formularios RHF/Zod, consultas y mutaciones TanStack Query. Carga/error/vacío, búsqueda/paginación real y confirmaciones.
- `@dnd-kit/react` 0.5.3, Radix Dialog 1.3.1 y date-fns 4.4.0 instalados con versiones resueltas en lockfile. Arrastre por asa, destinos de columna/tarjeta, mutación optimista, restauración al fallar y sincronización canónica. Movimiento alternativo sin arrastrar desde el panel. Sin sustituir el stack.
- Al cambiar búsqueda/página de departamentos en el alta de tablero se limpia la selección para evitar enviar un ID que ya no aparece entre las opciones. Las pertenencias se leen completas mediante páginas reales de la API, no se truncan a los primeros 100 miembros.

### Verificación real (2026-11-03, America/Havana)
- Respaldo consistente previo con SQLite Online Backup API privado fuera del repositorio. Migración aplicada en principal y copia QA; base limpia desde cero y segunda aplicación sin duplicados. `db:generate` posterior sin cambios. Seis migraciones y 21 tablas; no se crean usuarios, tableros ni tareas al instalar.
- `pnpm typecheck` y `pnpm build` correctos en compartido/API/web. Continúan avisos no bloqueantes Zod/Rollup y bundle web >500 kB (~796 kB), no ocultados.
- QA usa la misma API/SPA y SQLite real independiente; seis cuentas creadas mediante CLI con Argon2id, contraseñas aleatorias privadas. Roles, departamentos y miembros gestionados mediante HTTP real. Nada de suites guardadas, mocks ni respuestas simuladas.
- HTTP: sin sesión 401; USER 403; técnico sin pertenencia al tablero 404 incluso siendo del departamento; VIEW lee pero no modifica; EDIT trabaja pero no administra; MANAGE configura. Filtros por departamento ajeno no amplían el alcance. Baja de permiso se aplica inmediatamente y responsable inactivo se rechaza.
- Altas/configuración de tableros, cuatro columnas iniciales, miembros elegibles, rechazo de técnicos de otro departamento/USER, columnas editar/reordenar/eliminar, tareas/edición/asignación, comentarios/checklist/historial y filtros de archivo comprobados contra las filas persistidas. Columna ajena 404, índice obsoleto 409, campos extra/paginación fuera de rango 422, CSRF inválido 403.
- Movimientos entre columnas, doce movimientos sucesivos agotando huecos y normalización, más dos movimientos concurrentes: orden entero persistente y sin posiciones duplicadas en el destino. No hay cambio de tablero por PATCH.
- Triggers temporales exclusivamente en copia QA, retirados en `finally`: fallo de auditoría durante movimiento revierte tarea y evento; fallo posterior a notificación de asignación revierte tarea, responsables, eventos, auditoría y notificación. Un primer chequeo esperaba incorrectamente 500; el filtro existente traduce restricciones SQLite a 409. Se corrigió la expectativa y se repitió sobre una copia limpia, sin cambiar la API para acomodar el chequeo.
- Retirar miembro desasigna tareas activas y pierde acceso inmediatamente; departamento queda retirable tras retirar pertenencias del tablero. Tablero archivado bloquea cambios, pero conserva retirada de miembros. Tarea archivada bloquea ediciones; columna ocupada únicamente por tarea archivada tampoco se elimina.
- Chromium real: alta/edición de tablero, incorporación de técnico, alta de columna, tarea con responsable, edición, checklist, comentario e historial; arrastre real con eventos de puntero entre columnas, recarga conservando destino; rechazo real mediante trigger SQLite restaura tarjeta y base. VIEW sin controles de edición; EDIT con trabajo pero sin administración; archivado de tarea y vista de archivo solo lectura; no miembro no ve datos.
- Arrastre real adicional sobre otra tarjeta reordena dentro de la misma columna; el orden se conserva al recargar. Cero posiciones activas duplicadas en la comprobación final.
- Capturas desktop/tablet/móvil en `docs/verification/phase6-qa-*.png`, revisadas visualmente. Corresponden a la copia aislada, no al despliegue institucional. No se inyectaron escenarios QA en la base principal.
- OpenAPI syntax lint correcto; colección v3 `Scanned: 74 | Errors: 0 | Warnings: 0`. Postman local: nueve lecturas GET 200 en dos ejecuciones (5 y 4), cero fallos y cero scripts/assertions. Resultado literal completo: [verification/phase6-postman.md](verification/phase6-postman.md). Sin login cloud ni publicación.
- Principal, QA y limpia: `integrity_check=ok`, cero errores FK, seis migraciones. Principal conserva tres usuarios, dos departamentos, dos categorías y el ticket/comentario previo, sin tableros/tareas precargados. Puedes crearlos realmente desde Tableros.

- Chromium principal: entrada local conservada, Tableros conectado muestra vacío real con alta disponible, bandeja conserva UNI-000001, departamentos anteriores presentes y logout correcto. Captura `phase6-main-boards-desktop.png`.
- Limpieza: logout QA/Postman 204 y cookie anterior 401; sesiones QA revocadas, credenciales/cookie jar temporales retirados, API/SPA de QA y Chromium detenidos, perfil del navegador eliminado. Solo quedan evidencia y bases privadas fuera del repositorio. Principal sigue en 5173/API 3000 con salud 200.
- `postman skills status`: current. `postman status` final no está implementado por CLI 1.76; no se confundió con un error de la aplicación.

### Límites
- No se comenzó fase 7: no existe `task_ticket_links`, crear tarea desde ticket, relaciones ni endpoints de vinculación. El DTO público de tickets no se modificó ni revela tareas.
- Se mantiene el dashboard básico de tickets de fase 5; métricas de tareas y notificaciones en pantalla se integrarán en fase 8. No hay UI simulada de esas funcionalidades.
- Entrada de desarrollo real conservada, sin volver obligatoria la contraseña para mirar. Las rutas siguen protegidas por sesiones/roles; producción no admite ese acceso local. LDAPS real y despliegue siguen pendientes de infraestructura externa, sin relajar TLS.

## Fase 7 — integración privada de tickets y tareas

### Implementado
- Contrato OpenAPI 1.6 previo a la implementación. Cinco operaciones: GET/POST `/staff/tickets/:id/tasks`, GET/POST `/tasks/:id/tickets`, DELETE `/tasks/:id/tickets/:ticketId`. Colección local `University Phase 7` con 78 peticiones, sin scripts ni publicación cloud.
- Migración Drizzle `0006_task_ticket_links.sql`: tabla de relación muchos-a-muchos, PK tarea/ticket, FKs explícitas a tarea/ticket/autor e índice inverso por ticket. Siete migraciones y 22 tablas actuales; no hay seeds ni cambio de dependencias/lockfile necesario.
- `TaskLinksRepository` concentra persistencia y consultas: SQL exige simultáneamente alcance del ticket y pertenencia/autorización al tablero, y mismo departamento. Los totales paginados tampoco revelan relaciones con tableros ajenos.
- `TaskLinksService` centraliza reglas y transacciones. Lectura VIEW; escritura EDIT/MANAGE y técnico responsable del ticket o ADMIN. Se conserva la regla anterior de tickets asignados. Sin sesión 401, USER 403, recurso inaccesible 404, duplicado/incompatibilidad 409, entrada inválida 422; origen/CSRF siguen obligatorios.
- Crear tarea desde ticket reutiliza `TasksService` dentro de una transacción exterior: validar ambos recursos, crear tarea/responsables/eventos/notificaciones y vínculo/auditoría, o revertirlo todo. Título y descripción iniciales son editables en React; el estado del ticket no se cambia ni se sincroniza automáticamente al completar tareas.
- Vincular/desvincular tareas existentes preserva las entidades. Registra evento privado `UPDATED` con acción `TICKET_LINKED`/`TICKET_UNLINKED` y auditoría; no añade eventos, metadatos ni notificaciones de tareas al portal público de tickets.
- Solo se admiten relaciones del mismo departamento. Se bloquea con 409 el traslado de un ticket vinculado hasta retirar sus relaciones, dentro de la transacción administrativa existente. Cambiar solo categoría/responsable en el mismo departamento no requiere desvincular.
- Tickets CLOSED no admiten cambios de vínculos. No se crean vínculos sobre tarea/tablero archivados, pero se permite retirarlos con permisos de edición como revocación privada, evitando bloquear para siempre un traslado por una tarea histórica. Los datos y eventos históricos se conservan.
- Frontend conectado: sección Tareas internas relacionadas en atención, crear desde ticket con selector paginado de tablero autorizado del mismo departamento y formulario RHF/Zod prellenado, vincular existentes y desvincular. En tareas: Tickets asociados, búsqueda/paginación de tickets editables, incorporación y retirada. Estados vacíos/errores y confirmaciones reales.
- Enlace a tablero `?taskId=...` abre directamente el panel de la tarea; ese mismo panel enlaza al detalle interno del ticket. Invalidaciones TanStack Query sincronizan relaciones, cambios de estado, archivado y movimiento de columnas. VIEW no muestra controles de escritura.
- Las rutas `/tickets` del solicitante y sus DTOs permanecen intactos: ninguna tarea, relación, título privado ni evento interno se incorpora a la respuesta pública. Los técnicos no miembros tampoco ven tareas ni totales de tableros ajenos.

### Verificación real (2026-11-04, America/Havana)
- Respaldo consistente previo mediante SQLite Online Backup API, privado fuera del repositorio. Node 24 LTS disponible en caché (24.19.0, mismo ABI; no se cambió el Node del sistema ni los pins del proyecto). El intento de recuperar el binario temporal anterior no respondió y se canceló; no se instalaron dependencias nuevas.
- `pnpm typecheck` y `pnpm build` correctos. Avisos no bloqueantes de Zod/Rollup y bundle web >500 kB (~805 kB) conservados, sin ocultarlos.
- Migración generada y aplicada en principal, copia QA y base vacía; reaplicada sin duplicados. `db:generate` posterior sin diferencias. Integridad `ok` y cero errores FK en las tres; principal conserva sus tres usuarios, dos departamentos, dos categorías y ticket previo, sin tableros/tareas/vínculos precargados. Base limpia sin cuentas ni entidades de negocio.
- QA: misma API/SPA con SQLite aislada y cinco cuentas reales creadas por CLI con Argon2id. Roles y pertenencias gestionados por HTTP administrativo; contraseñas aleatorias privadas. Sin mocks ni suites versionadas. Un primer escenario de tablero oculto llevaba por error un responsable que no era miembro: la API lo rechazó correctamente; se corrigió el cuerpo y se repitió sobre una copia limpia, sin cambiar la regla del backend.
- API real: creación atómica desde ticket, una tarea con dos tickets y un ticket con tareas en dos tableros; duplicado 409; vínculos privados en historial de tarea/auditoría pero no en eventos públicos. Tarea y ticket permanecen tras desvincular; vínculo ausente 404 y nueva vinculación posterior funciona.
- Alcance: USER/anon denegados; técnico sin pertenencia al tablero recibe 404 en tarea y lista de relacionadas vacía con total cero en ticket; técnico de otro departamento recibe 404; VIEW lee pero no desvincula; compañero no responsable no puede crear desde ticket. ADMIN no puede cruzar departamentos (409). Lista/totales del técnico excluyen incluso el ID del trabajo en el tablero oculto.
- Columna de otro tablero no crea tarea huérfana; atributos privilegiados adicionales y límites inválidos rechazados; CSRF incorrecto 403. Traslado con vínculos devuelve 409 y mantiene departamento original. Retirar vínculo de tarea archivada permite traslado posterior; tablero archivado rechaza nueva vinculación y permite retirada autorizada. Ticket CLOSED mantiene vínculos de solo lectura.
- Fallos reales mediante triggers temporales solo en QA y retirados en `finally`: fallo al insertar vínculo revierte tarea, responsables, notificaciones, eventos y auditoría; fallo de auditoría al desvincular restaura el vínculo. No se añadió mecanismo de fallo/depuración a la API.
- Chromium real: formulario prellena título/descripción reales, permite cambiarlos y guarda tarea/vínculo; enlace abre el panel correcto con ticket asociado; desvincular/vincular desde ambos lados se refleja en SQLite; técnico no ve tablero oculto, VIEW no tiene botones de escritura y solicitante no ve sección/títulos/relaciones internos.
- Capturas desktop/tablet/móvil revisadas en `docs/verification/phase7-qa-*.png`. No son evidencia de despliegue institucional. La verificación funcional se hizo contra API real, no respuestas interceptadas.
- OpenAPI syntax lint y colección v3 correctos: `Scanned: 78 | Errors: 0 | Warnings: 0`. Postman local ejecutó tres GET 200 en dos ejecuciones, sin fallos ni scripts/assertions. Salida literal y aviso cloud de la CLI: [verification/phase7-postman.md](verification/phase7-postman.md). No se inició sesión cloud ni se publicó nada.

- Chromium principal: entrada de desarrollo real conservada; ticket previo muestra los nuevos controles y selector conectado sin tableros fabricados; no se modificó su contenido ni se crearon tareas de ejemplo. Captura `phase7-main-ticket-controls.png`.
- Cierre de QA: logout 204 y cookie anterior 401, sesiones temporales revocadas, credenciales/cookie jar retirados. API/SPA aisladas y Chromium detenidos; perfil temporal eliminado. Principal permanece disponible en 5173/API 3000, salud 200.

- Guías Postman actuales; `postman status` final no existe en CLI 1.76 (`unknown command`), limitación ya documentada. No se confundió con un fallo de la API.

### Límites
- No se inició fase 8: no hay interfaz/API/polling nuevos de notificaciones ni métricas de tareas en dashboard. Se conservan las notificaciones almacenadas por fases anteriores.
- Entrada local sin contraseña conservada y protegida como antes. LDAPS real, certificados y despliegue institucional siguen pendientes de infraestructura externa; no se relajó TLS.

## Fase 8 — notificaciones WebSocket y dashboard

### Alcance e implementación
- El usuario pidió expresamente WebSocket para notificaciones en la web. Se cambia únicamente esa exclusión del plan: Socket.IO 4.8.4, adaptador y gateways NestJS 11.2.8 compatibles con el Nest instalado, cliente web 4.8.4. Versiones resueltas en pnpm-lock.yaml. Sin Redis, colas, microservicios, JWT, mocks ni suites nuevas.
- Contrato OpenAPI 1.7 y colección `University Phase 8` con 82 peticiones. GET `/notifications`, GET `/notifications/unread-count`, PATCH `/notifications/:id/read`, POST `/notifications/read-all`; DTO compartido Zod y validación estricta/paginación 20/100. `x-realtime` documenta el protocolo Socket.IO, no un endpoint REST ficticio.
- Nuevo módulo global de notificaciones para que tickets y Kanban compartan una instancia. Repositorio Drizzle con alcance SQL por destinatario y permisos actuales de ticket/tablero; contador, lista y marcado excluyen avisos internos de recursos que ya no son accesibles. Cambio a USER no deja visibles notificaciones históricas privadas. Marcado individual idempotente y global solo sobre no leídas visibles.
- WebSocket en el mismo servidor HTTP, path `/api/v1/realtime`, cookie HttpOnly + CSRF y Origin exacto. Sin elección de destinatarios, rooms o mensajes de aplicación desde el cliente. Revisa expiración, usuario activo, revocación/proveedor y LDAP requerido al conectar, antes de emitir y cada 30 segundos. Máximo 500 conexiones de transporte/cinco por usuario. No se relaja HTTPS/proxy/LDAPS en producción.
- Evento `notifications:changed` sin payload: no transmite IDs, títulos, notas, tokens ni destinatarios. El cliente recupera HTTP autenticado. Señal postcommit mediante microtarea y comprobación de persistencia de la fila en las transacciones SQLite síncronas existentes. Un rollback no deja aviso ni genera señal.
- Se integran los avisos ya generados por altas/asignaciones de tickets, respuestas públicas, cambios de estado y asignaciones de tareas. Las notas internas no notifican al solicitante ni se copian a sus avisos. No se notifica la acción al propio autor.
- React: campana en cabecera, contador, dropdown con cinco avisos y estados reales; página de notificaciones para cada área, filtro de no leídas, paginación, marcado individual/global, enlaces a ticket o panel de tarea y aviso discreto al aumentar el contador. Reintento/estado de conexión y recuperación de avisos al conectar. Vite proxifica upgrade WebSocket antes de `/api`.
- WebSocket es el canal inmediato; HTTP reconcilia cada 30 segundos aun conectado para recuperar señales perdidas y reflejar retiradas de permisos. No es push nativo ni funciona con el navegador cerrado.
- Dashboard añade `myPendingTasks`: tareas asignadas al usuario, no archivadas, tablero accesible/no archivado y columna no completada. Mantiene métricas SQL y alcance de tickets de fase 5; refresca con avisos y cada 30 segundos. ADMIN ve sus tareas, no una cifra global de tareas presentada como propia.
- Corrección de seguridad relacionada: GET periódicos de sesión/notificaciones/dashboards y comprobaciones del socket no prolongan la inactividad. El antiguo sondeo de `/auth/me` podía renovar silenciosamente las ocho horas de una pestaña olvidada; ahora se conserva el vencimiento salvo actividad HTTP explícita de negocio.
- No hay cambio de esquema: se reutiliza `notifications` creada en fase 4. Siete migraciones existentes, sin migración vacía ni seeds.

### Verificación local real (2026-11-04)
- Respaldo previo consistente con SQLite Online Backup API en archivo privado fuera del repositorio. QA sobre una copia aislada, API 3008/SPA 5178; credenciales locales aleatorias protegidas con Argon2id por CLI. No se crearon datos demostrativos en la base principal.
- HTTP + Socket.IO reales: administrador, solicitante, otro USER y técnico conectados por transporte WebSocket. Handshake anónimo, CSRF incorrecto, Origin ajeno e inyección de userId rechazados. Mensaje cliente arbitrario desconecta. Cada evento observado tenía cero argumentos y los destinatarios ajenos no recibían señales.
- Alta de ticket notifica a ADMIN, asignación al técnico, respuesta pública al solicitante, nota interna sin señal ni texto privado para USER. Cambio de estado genera aviso persistido. Lectura ajena 404, CSRF incorrecto 403, límite 101 rechazado con 422. Marcar conserva timestamp en repetición y sincroniza otra pestaña; read-all no altera los avisos del técnico.
- Tarea asignada genera aviso privado con enlace a tablero/tarea; KPI real 1 y 0 al mover a columna completada. Técnico de otro departamento con cero tareas propias. Retirar miembro oculta su aviso histórico, marcado 404 y KPI cero. Restaurar pertenencia y reasignar funciona.
- Fallo real de inserción de notificación mediante trigger temporal solo en QA (retirado en finally): HTTP 409, tarea y notificación revertidas, sin señal WebSocket. No se añadió endpoint ni modo de depuración a la aplicación.
- Promoción administrativa y posterior cambio a USER: notificación interna real deja de ser visible, contador cero y marcado 404. Sesión revocada, usuario desactivado y sesión con inactividad vencida desconectan en comprobación periódica sin requerir otro aviso; HTTP 401. Logout impide la siguiente señal incluso antes del intervalo. GET de sesión/lista/contador no cambia last_seen_at ni expires_at en SQLite.
- Chromium: respuesta pública real produjo toast y aumento de contador en menos de 3,5 segundos sin recargar (no esperando el polling). Dropdown real, marcado global, filtro no leídas y enlace al ticket correcto con texto público pero sin nota interna. Técnico recibe enlace que abre el panel de tarea correcto; asignación actualiza el KPI sin recarga.
- Se detectó dropdown fuera de pantalla móvil; corregido anclándolo a la cabecera con límites de altura disponibles. Capturas desktop/tablet/móvil en `docs/verification/phase8-*.png`, revisadas visualmente. Son evidencia local, no de despliegue institucional.
- Postman local: tres lecturas reales 200, sin scripts ni assertions; salida literal en [verification/phase8-postman.md](verification/phase8-postman.md). El aviso de login cloud de CLI no impidió la ejecución local; no se publicaron artefactos ni se inició sesión externa.

- `pnpm typecheck` y `pnpm build` finales correctos. Bundle web ~855 kB con aviso >500 kB y advertencias existentes de Zod/Rollup, sin silenciarlos. `db:generate` sin diferencias; migraciones aplicadas en principal y base vacía, reaplicadas idempotentemente. Integridad ok y cero errores FK en principal, QA y limpia; limpia sin usuarios ni entidades de negocio.
- OpenAPI syntax lint sin incidencias y colección v3 `Scanned: 82 | Errors: 0 | Warnings: 0`. Guías Postman actuales. `postman status` no está implementado por CLI 1.76; no se confunde con un error de API.
- Reconexión real en Chromium: se detuvo la API QA, se mostró desconexión, se reinició con la misma SQLite y se creó un aviso mientras el navegador no tenía transporte; al reconectar recuperó el aviso sin recarga ni nuevo login. La emulación offline por sí sola no cortaba un WebSocket ya establecido; se verificó con parada real del servidor, no respuestas interceptadas. Se corrigió la reconexión ante cierre explícito de gateway durante reinicio: reintenta handshake sin convertir inmediatamente una caída de transporte en error de sesión. El rechazo real de autenticación sí vuelve a comprobar la sesión.
- Navegador principal: entrada de desarrollo, WebSocket conectado, campana/lista vacías reales, dashboard con tareas propias y logout funcional. Capturas `phase8-main-notifications.png` y `phase8-main-dashboard.png`. No se crearon avisos simulados para rellenar esa vista.
- Comparación con respaldo previo: departamentos, categorías, tickets, tableros, tareas y notificaciones principales íntegramente iguales. Se conservan tres usuarios, dos departamentos, dos categorías, un ticket, un tablero previo y cero tareas/notificaciones. La actividad de login añade únicamente sesiones/auditoría esperadas.
- Cierre QA: logout 204, cookie anterior 401, sesiones temporales revocadas, credenciales/cookie jar y perfil Chromium retirados. API/SPA QA y Chromium detenidos. Principal sigue en 5173/API 3000, salud 200.

### Límites
- No se inició fase 9. Docker/HTTPS institucional, LDAPS real, firewall/VPN, primer administrador institucional y operación en servidor requieren infraestructura externa; no se presentan como verificados.
- Entrada **Entrar en desarrollo** preservada bajo sus condiciones locales explícitas. No se elimina seguridad ni se hace público ningún tablero para probar notificaciones.

## Fase 9 — preparación de despliegue del MVP

### Entregado
- `apps/api/Dockerfile`, `apps/web/Dockerfile` y `.dockerignore`: builds multietapa con Node 24.15.0, pnpm 12.15.0/lock congelado y Caddy 2.11.7 disponible en registro oficial. Native better-sqlite3 compilado en Debian con el mismo ABI que runtime. API UID 1000, sin fuentes/compiladores/credenciales; web compilada y no-root en 8080.
- `infra/docker-compose.yml`: solo caddy/web/api, solo Caddy publica puertos en la interfaz configurada; base y copias en bind mounts locales privados, CA AD de solo lectura y contraseña mediante secreto por archivo. Rootfs read-only, capacidades reducidas, logs rotados, reinicio y healthchecks. Sin servicios adicionales ni CI/CD.
- `infra/Caddyfile` / `Web.Caddyfile`: HTTPS con CA institucional o Caddy internal, redirección HTTP, SPA y assets con caché diferenciada, proxy API preservando path y WebSocket; CSP con WSS del host/puerto explícito, cabeceras esenciales y logs sin cookies/CSRF/Authorization. API confía exclusivamente en IP fija de Caddy; pool dinámico aparte evita que API/web ocupen esa dirección antes de arrancar Caddy.
- Variables institucionales sin valores inventados en `infra/env/production.env.example`, ignorado el fichero real; wrapper `infra/scripts/compose.sh`. Datos de desarrollo no se trasladan: producción rechaza identidades locales, proveedor local, origen HTTP, LDAP sin TLS y CA inválida.
- Entry point con preflight de montajes privados/escribibles, rechazo de almacenamiento RAM/red y flock de una única API. Migraciones Drizzle al arrancar; respaldo consistente antes de nuevas migraciones, no en cada reinicio.
- Comandos compilados y scripts pnpm reales para backup, restauración protegida y comprobación LDAPS. Backup Online API, integridad/FKs y 0600 sin sobrescribir archivos. Restauración offline con el mismo lock, copia anterior, revocación de sesiones y auditoría. No hay endpoints de mantenimiento.
- `docs/deployment.md`, `docs/backup-restore.md`, AD/README/realtime/Postman actualizados: instalación, permisos, confianza CA, DNS/firewall LAN-VPN, bootstrap administrativo, actualización y recuperación. Ninguna configuración de Windows Server/firewall/DNS se modificó automáticamente.

### Verificación local real (2026-11-04)
- Docker Engine real, Compose 5.7.0 temporal fuera del repositorio (el plugin no estaba instalado en esta máquina). Sin modificación global del entorno. Builds reales de ambas imágenes y arranque de los tres servicios con volúmenes aislados. Caddy 2.11.8 estaba publicado en GitHub pero no en Docker Hub: se fijó la imagen estable disponible 2.11.7. Se adaptó COPY a builder clásico y se retiró la file capability del Caddy web no-root para que pudiera ejecutarse con cap_drop ALL.
- HTTPS real con raíz de Caddy confiada explícitamente, sin `-k` ni bypass TLS: salud API/SQLite 200, cookie anónima de producción __Host-/Secure/HttpOnly, entrada de desarrollo ausente/404 y recursos privados 401. WSS atraviesa Caddy y rechaza autenticación anónima. SPA por ruta directa 200, asset inexistente 404, HTTP 301 al origen HTTPS. CA no confiada provoca fallo TLS. Chromium con almacén NSS aislado renderiza login institucional como contexto seguro.
- Peer ajeno dentro de la red Docker no puede suplantar HTTPS con X-Forwarded-Proto (403); marcador en Cookie/CSRF no aparece en logs de Caddy. Solo Caddy tiene puertos publicados, en loopback durante QA. Configuración vacía falla en lugar de arrancar con ejemplos.
- Rechazos reales: AUTH_PROVIDER local en producción, APP_ORIGIN HTTP, AD_URL LDAP simple, CA inválida, volumen de datos ausente, tmpfs e identidades locales. Restauración mientras API activa falla con código 75; copia local de desarrollo no se restaura en producción.
- Copia/restauración sobre base institucional vacía y esquema histórico real de seis migraciones: al arrancar genera respaldo con seis y actualiza a siete; copia y resultado pasan integridad/FKs. No se inventaron migraciones ni se usó push. `db:generate` sin cambios y migraciones locales idempotentes.
- En el mismo empaquetado se utilizó un override temporal **de desarrollo/local**, no distribuido, para comprobar negocio sin fingir AD: cuentas Argon2id por CLI, promoción/roles/departamento, ticket real, asignación y respuesta, WSS autenticado, nota interna invisible al solicitante, tarea/KPI/movimiento/vínculo privado y USER sin acceso a tablero. No son cuentas institucionales ni seeds de la aplicación.
- Recuperación con datos de ese flujo: backup online, comentario posterior, parada/restauración y consulta HTTPS real. Cookie activa respaldada queda revocada (401), nuevo login válido, comentario posterior ausente, respuesta previa/tarea/columna/vínculo/notificación conservados. Recrear contenedor conserva sesión nueva y ticket; logout 204 y cookie anterior 401. Primeras comprobaciones manuales usaban campos planos id/departmentId equivocados; se corrigieron al contrato ticketId/department.id, sin cambiar la API.
- Compilación/tipado estrictos y build web correctos; permanece aviso de bundle ~855 kB, no se oculta. Postman local ejecutó health 200 con cero scripts/assertions; salida literal en `verification/phase9-postman.md`. Sin nuevos endpoints REST: OpenAPI 1.7 y colección de 82 peticiones siguen vigentes. `postman status` no está disponible en CLI 1.76, limitación ya conocida.

### Pendiente externo antes de producción
- Configurar los valores reales de production.env, preparar certificados LDAPS en Windows Server, DNS/puerto 636 y confianza CA, comprobar cuenta de lectura y **login de una cuenta institucional**. La prueba LDAPS local falla cerrado porque no hay AD configurado; no se sustituye por un LDAP simulado.
- Activar HTTPS con confianza institucional en clientes, bootstrap del administrador real y datos organizativos desde el panel. Aplicar y comprobar firewall/LAN/VPN desde clientes autorizados y externos. Health/ensayo local no demuestran estos puntos.
- No se inició ninguna ronda de ajustes posteriores ni se añadieron funcionalidades fuera del MVP.

## Rediseño visual — oscuro permanente

- Tema grafito desde el HTML inicial, sin selector ni dependencia del sistema.
  Tokens semánticos en todas las pantallas y portales, tablas, Kanban, formularios,
  estados, errores, foco, scroll, autofill y movimiento reducido.
- Sidebar Radix de shadcn/ui (new-york-v4), grupos por área y rol, tooltips al
  plegar, Sheet móvil, cierre al navegar y atajo Cmd/Ctrl+B sin interceptar campos.
- Zustand 5 guarda solo la preferencia de sidebar. Sesiones, permisos y datos
  continúan en TanStack Query. Dependencias Radix necesarias y lockfile resuelto.
- Login, resumen operativo y nueva solicitud rediseñados; organización y tareas
  con campos etiquetados, errores asociados y React Hook Form/Zod conservados.
  No cambia API, permisos, esquema, migraciones ni el flujo de notificaciones.
- Tipado y build del monorepositorio correctos. Comprobación manual con Chromium:
  oscuro con sistema claro, sesión local real, plegado persistente, menú móvil,
  tablas/detalle de tickets, tablero real, diálogo y errores sin guardar, dropdown
  de avisos, páginas administrativas/perfil; sin nuevas excepciones de aplicación.
  Vistas de 375×812 y 768×1024 sin desbordamiento del documento.
- Sin registros de negocio añadidos: 2 departamentos, 2 categorías, 1 ticket,
  1 tablero, 0 tareas y 0 notificaciones; integridad SQLite correcta, 0 errores FK.
- Decisiones, alcance y límites: `design.md`; capturas: `verification/redesign-*.png`.
  Permanece aviso de bundle >500 kB. No se reconstruyeron ni desplegaron las
  imágenes Docker: publicar una nueva release cuando corresponda.

## Identidad visual — La Pizzara

- Renombrado visible del producto en pestaña, login, menú, perfil, pie de página,
  README y ficha de diseño. Nombre exacto confirmado: **La Pizzara**.
- Isotipo vectorial original que combina pizarra de trabajo y porción de pizza;
  favicon SVG, apple-touch PNG, iconos 192/512 y web manifest para instalación.
- Sin cambiar API, rutas, proveedor de identidad, datos ni esquema. Conservada la
  clave `campus-workspace-ui` para no descartar la preferencia ya guardada.
- Detalles y archivos: `docs/brand.md`. Tipado/build del frontend correctos; favicon, marca en login, manifest y archivos públicos servidos correctamente. Revisión visual con Chromium guardada en `docs/verification/brand-login.png`.

## 2026-11-04 · Vistas de tareas y categorías

- Tablero rediseñado y nueva lista con cambio de estado, orden manual y ordenación por título/prioridad/fecha.
- Búsqueda y filtros combinables en URL; categorías privadas por tablero, varias por tarea, CRUD real con permisos y auditoría.
- Nueva migración Drizzle 0007 aplicada con respaldo previo. Sin cambios en datos de negocio anteriores.
- Arrastre probado con filtros y tareas ocultas, permisos VIEW/EDIT/MANAGE y formularios conectados; ajuste responsive de acciones.
- Build/typecheck/migraciones/lint correctos. Detalles en `docs/kanban-views.md` y `docs/verification/kanban-views.md`.

## Actualización de runtime y entrada de desarrollo · 2026-11-08

A petición expresa del usuario, la referencia actual pasa de Node 24 a **Node
26.13.0 LTS**, conservando pnpm, dependencias del lockfile, SQLite y arquitectura.
Las verificaciones anteriores con Node 24 son históricas y no se reescriben.

- `.node-version`, `.nvmrc`, engines y Dockerfiles alineados a Node 26.
- Un solo comando desde raíz: **`npm run dev`**, sin prefijos ni gestor de Node.
- Preflight comprueba runtime y addon SQLite sin abrir la base; reconstruye solo
  `better-sqlite3` si su binario falta o corresponde a otro ABI. Si no puede
  prepararlo, detiene el arranque antes de levantar los servicios.
- Build completo y tipado del monorepo comprobados con Node 26.13.0.
- Arranque real con el comando anterior: Nest/API 3000 y Vite 5173 responden HTTP
  200; `/api/v1/auth/csrf` a través del proxy responde 200 con proveedor local y
  acceso de desarrollo disponible. No se probó login AD ni despliegue institucional.
- Se reconstruyó el addon para ABI147 sin actualizar versiones del lockfile ni
  ejecutar migraciones o escrituras de negocio. Los avisos PURE de Zod y bundle
  >500 kB siguen siendo no fatales.
- Las nuevas imágenes Docker no se han construido ni desplegado en esta ronda.

La comprobación del addon usa un proceso hijo nuevo antes/después de la reparación:
recargar en el mismo proceso un addon que falló `dlopen` y fue sustituido en disco
provocó `Module did not self-register`; la comprobación aislada evita ese estado.

## Sin throttling en desarrollo local · 2026-11-08

Por petición del usuario, se omiten los límites de peticiones cuando coinciden
`NODE_ENV=development`, `AUTH_PROVIDER=local` y `APP_HOST=127.0.0.1` o `::1`.
Incluye el límite global y los decoradores de login/acceso de desarrollo. En
producción, con LDAP o con escucha no-loopback se conservan. No se omiten sesión,
roles, origen ni CSRF. Documentado en README y descripción OpenAPI, sin cambiar
rutas/esquemas ni añadir suites.

Verificación: build de API correcto; predicado real del módulo devuelve true para
local IPv4/IPv6 y false para producción/LDAP/LAN. API local real: 130 GET health
respondieron 200, y siete POST de acceso de desarrollo sin CSRF respondieron 403,
ninguno 429. No se crearon sesiones ni se hicieron escrituras de negocio; no se
arrancaron/detuvieron procesos del usuario. La comprobación de producción es del
predicado de configuración, no un despliegue ni un login AD institucional.

## Bandeja desplegable y Mis tickets · 2026-11-08

- Sidebar de personal/administración: **Bandeja de tickets → Todos los tickets / Mis tickets**; apertura con teclado, indicador de ruta activa y navegación móvil.
- Mis tickets usa el ID de sesión como `assignedToId` en la API existente, conservando alcance de permisos, filtros y paginación del servidor. No permite cambiar el responsable desde esta vista ni lanza una consulta general mientras falta la sesión.
- Mis solicitudes permanece separado como portal del solicitante. Sin cambios de API, esquema o migraciones.
- Build web y `git diff --check` correctos. Chromium con API/SQLite aisladas: técnico ve su ticket asignado, administrador sin asignaciones no lo ve, recarga conserva la ruta, menú funciona con teclado/sidebar plegado/móvil y sin errores JavaScript. Evidencia y límites en `docs/verification/assigned-tickets.md`.

## Selectores shadcn/ui y bandeja moderna · 2026-11-08

- Sustituidos los 39 selectores nativos por Select shadcn/Radix con presentación oscura compartida. Integración controlada con RHF sin eventos simulados; conserva grupos, opciones inactivas, validación, resets y valores nullable.
- Todos los tickets y Mis tickets: filtros compactos, búsqueda con debounce, filtros avanzados desplegables, etiquetas extraíbles, limpieza global, resultados y tabla rediseñados. Sin cambios de API ni persistencia.
- Añadido únicamente `@radix-ui/react-select@2.4.1` y sus dependencias necesarias al lockfile; no actualizaciones generales.
- Tipado del monorepo y build web correctos. Revisión de navegador con API y SQLite aisladas: filtros reales, formularios persistidos, desasignación null, reset de categoría/color, cancelación de rol, selección en diálogo, teclado y móvil. Sin nuevas suites ni datos de revisión en la base habitual. Detalles en `docs/verification/selects-ticket-inbox.md`.

## Chat persistente y en vivo por ticket · 2026-11-08

- Chat compartido entre portal propio y detalle interno, con burbujas, fechas, notas privadas diferenciadas, historial anterior y borradores en memoria. Reutiliza los comentarios existentes, sin migraciones.
- Señal `tickets:changed` sin payload sobre el mismo Socket.IO, verificada contra evento persistido, sesión y alcance actual; recuperación HTTP con permisos y CSRF en escrituras. Notas internas no despiertan al solicitante sin acceso de personal.
- Reconciliación tras conectar/reconectar y cada 30 segundos. Lecturas de detalle/comentarios/eventos no renuevan la inactividad de sesión. Cierre propagado deja el chat de solo lectura.
- API y web compilan; typecheck del monorepo correcto. OpenAPI 1.9 documenta la extensión WebSocket; lint sintáctico sin violaciones. La colección REST existente se reutilizó, sin crear suite ni publicar nada.
- Dos sesiones reales en Chromium sobre copia aislada: intercambio bidireccional en ~0,17 s en la ejecución medida, persistencia tras recarga/reinicio de API, privacidad, paginación sin duplicados, mantenimiento del borrador y cierre/CSRF/permisos comprobados. Rollback real no emite señal. Ver `docs/verification/ticket-chat.md`.
- Por la instrucción local de API, `postman skills status` detectó versiones atrasadas y `postman skills update` actualizó solo api-engineer/workspaces. No se actualizó la CLI ni se inició sesión/publicó en Postman.

## Catálogo de estado de servicios · 2026-11-08

- Catálogo oscuro adaptable por tarjetas, búsqueda/filtros y fichas enlazables. Estados informados manualmente; no se simula monitorización ni disponibilidad. Vacío inicialmente, sin servicios sembrados.
- ADMIN administra servicios, archivo/restauración y notas públicas/internas. USER y TECHNICIAN nunca reciben notas internas del servicio; controles de rol y proyecciones explícitas en API.
- Vínculo opcional de un servicio por ticket, seleccionable en alta/detalle y desde el catálogo. Conserva propiedad/alcance/responsabilidad, bloquea cambios en cerrado y vínculos nuevos a archivados; auditoría transaccional.
- Drizzle 0008 versionada, probada y repetida en copia aislada antes de aplicarse localmente, con copia consistente previa. Sin datos de QA en la base habitual.
- Contrato v1.10 y colección manual de 14 peticiones; sin publicación externa. Detalles funcionales en `docs/service-status.md` y evidencia/límites en `docs/verification/service-status.md`.
- Cierre: typecheck y build completos correctos; OpenAPI sin violaciones, colección sin errores, ejecución pública Postman **3 peticiones / 7 aserciones / 0 fallos**. Chromium ADMIN/USER/TECH comprobó formularios, privacidad, responsabilidad/alcance, archivo, recarga, teclado y móvil; integridad/FK correctas en ambas SQLite. Se corrigió una subconsulta correlacionada de preview detectada visualmente y se volvió a verificar contra una nota interna más reciente. Sin validación institucional ni despliegue Docker.

## Servicios primero y URL de acceso · 2026-11-08

- Retirado el bloque introductorio grande del catálogo; cabecera centrada y filtros compactos shadcn. Tarjetas en tres columnas amplias, estados protagonistas con texto/icono/color y notas compactas. Primera tarjeta/estado visibles sin scroll en escritorio y móvil revisados.
- URL opcional por servicio, editable por ADMIN, con Acceder en tarjeta y URL completa en ficha; apertura en pestaña nueva sin opener/referer. Solo HTTP/HTTPS absolutos, sin credenciales y hasta 2048 caracteres; no hay peticiones del servidor a la URL. PATCH omitido conserva y null elimina.
- Drizzle 0009 (columna nullable), aplicada en copia y repetida antes de la base local, con Online Backup privado previo. No se rellenaron direcciones ni datos ficticios en la base habitual.
- Build API/web y typecheck completo correctos. Chromium USER/ADMIN: filtros, URL/recarga, teclado, fichas, URL persistida, apertura real y móvil sin desbordamiento. URLs inválidas 422; sin CSRF y USER editando 403. Postman público: 3 peticiones / 8 aserciones / 0 fallos; lint sin violaciones. Evidencia: `docs/verification/service-status-ui.md`. Sin validación institucional ni nuevas suites.

## Planificación completa de tareas · 2026-11-08

- Fechas límite existentes ahora visibles con señales de vencida/hoy/completada;
  filtros combinables de fechas y bloqueos, sin marcar completadas como atrasadas.
- Subtareas multinivel y dependencias persistentes del mismo tablero, sin ciclos,
  con progreso, listas paginadas e historial. Bloqueos informativos, no restricción
  automática de movimientos. Archivo no equivale a completar.
- Plantillas por tablero con gestión MANAGE y uso EDIT; título/descripción/prioridad,
  plazo opcional y hasta 100 elementos de checklist. Guardado desde tarea completa,
  copia transaccional sin conversaciones/tickets ni elementos ya completados.
- Vista Calendario con URL/mes/filtros, entregas por día, agenda móvil, tareas sin
  fecha y reparto mensual por responsable (conteos reales, no horas estimadas).
- Drizzle 0010: tres tablas nuevas, respaldo consistente previo, prueba aislada y
  aplicación local sin alterar las 26 tablas previas de negocio. Nuevas tablas
  vacías en la base habitual; integridad y FKs correctas.
- Typecheck/build completos correctos; OpenAPI 1.12 sin errores de sintaxis;
  colección manual de diez peticiones. Postman: dos lecturas, seis aserciones,
  cero fallos. HTTP/Chromium con sesiones ADMIN/USER/VIEW/EDIT/MANAGE y SQLite real
  aislada. Ver `docs/task-planning.md` y `docs/verification/task-planning.md`.
- Sin suites añadidas, publicación Postman, commits, despliegue ni validación AD.
  Se mantiene el aviso de bundle Vite grande.
