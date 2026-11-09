# La Pizzara · Plataforma Universitaria

**Fase 9: preparación de despliegue del MVP**, conservando identidad, sesiones, departamentos, categorías, usuarios y auditoría de las fases anteriores. Sin mocks, semillas de usuarios, suites automatizadas ni CI/CD. Docker Compose, HTTPS, persistencia y procedimientos operativos preparados; la instalación institucional exige sus datos reales. Evidencia: [docs/progress.md](docs/progress.md).

## Marca visual

El producto se presenta como **La Pizzara**. Isotipo, favicon SVG, iconos para móvil y web manifest están en `apps/web/public`; detalles en [docs/brand.md](docs/brand.md).

## Entrar y mirar ahora

Abre **http://localhost:5173** y pulsa **Entrar en desarrollo**. En esta máquina se ha registrado por CLI la cuenta local `desarrollo`, iniciada y promocionada explícitamente a `ADMIN` por consola. El botón crea una sesión real persistida en SQLite, sin pedir contraseña. En **Resumen** y **Atención de tickets** puedes consultar y gestionar la bandeja real. En **Tableros** puedes crear tableros privados por departamento, incorporar miembros y trabajar con tareas. En **Mis solicitudes** puedes crear tickets propios, consultar su detalle y responder. Se conservan **Departamentos**, **Categorías**, **Usuarios**, **Auditoría**, perfil y logout.

Este acceso requiere una habilitación explícita en el `.env` ignorado por Git. No es un registro público ni desactiva los Guards. Solo funciona en desarrollo con autenticación local, API en loopback y origen local. Está prohibido en producción. El ejemplo distribuido lo deja **apagado**.

Ya hay panel de atención, resumen operativo de tickets y Kanban privado. Los tickets y las tareas ya pueden vincularse de forma privada. La campana y **Notificaciones** muestran tus avisos en vivo mediante WebSocket, con historial real en SQLite. Las páginas de permisos consultan rutas protegidas reales; no muestran estadísticas inventadas.

## Notificaciones en vivo (fase 8)

- La campana muestra el contador de no leídas y los últimos cinco avisos. **Ver todas** abre historial paginado, filtro de no leídas y marcado individual o global. El enlace abre el ticket público/interno o la tarea autorizada.
- Se notifican nuevas solicitudes a administradores, asignaciones de tickets/tareas y respuestas públicas/cambios de estado al solicitante. No hay avisos al propio autor ni notas internas enviadas al usuario final.
- Una sesión conectada recibe una señal WebSocket inmediata; React recupera el contenido por HTTP autenticado. Sin recargar la página. Al reconectar recupera los avisos perdidos; cada 30 segundos también reconcilia permisos/conteos desde SQLite.
- Las notificaciones de recursos privados dejan de mostrarse al perder acceso al tablero/departamento o cambiar de rol. Contador y marcado aplican el mismo alcance en SQL.
- El dashboard conserva las métricas de tickets y añade tus tareas pendientes reales; actualiza con avisos y cada 30 segundos.

**Cambio explícitamente solicitado:** se incorpora Socket.IO sobre WebSocket, aunque el plan original aplazaba WebSockets. No hay Redis, colas ni servicio adicional. Vite proxifica `/api/v1/realtime` con upgrade WebSocket hacia la API. No se necesitan variables ni credenciales nuevas. [Protocolo, seguridad y límites](docs/realtime.md).

## Despliegue preparado (fase 9)

Tres servicios: **caddy**, **web**, **api**. Imágenes multietapa, API no-root, frontend compilado, solo Caddy publica puertos. Volúmenes locales privados para SQLite y copias, secreto AD por archivo y confianza TLS sin bypass. Migraciones versionadas al arrancar con respaldo previo si hay cambios; bloqueo para una sola API y restauración offline con sesiones revocadas.

```bash
cp infra/env/production.env.example infra/env/production.env
chmod 600 infra/env/production.env
# Configura datos institucionales reales y prepara permisos/certificados primero.
./infra/scripts/compose.sh config --quiet
./infra/scripts/compose.sh build
./infra/scripts/compose.sh run --rm --no-deps api node dist/scripts/check-directory.js
./infra/scripts/compose.sh up -d --wait
```

**No copiar SQLite/cuentas de desarrollo a producción.** Producción rechaza proveedor local, entrada sin contraseña, origen HTTP, CA inválida, identidades locales y arranque sin montajes persistentes requeridos. El desarrollo local de las fases anteriores continúa igual.

Seguir [instalación, HTTPS, firewall, bootstrap y actualización](docs/deployment.md) y [copias/restauración](docs/backup-restore.md). No se configura AD/DNS/firewall automáticamente. Un ensayo local no sustituye login institucional ni verificación LAN/VPN en el servidor real.

## Requisitos

- Node.js **26.13.0 LTS**, pnpm **12.15.0**.
- Herramientas C/C++ para compilar `better-sqlite3` si no existe binario compatible.
- SQLite en disco local, nunca NFS; una sola instancia de API.

El proyecto usa Node 26.13.0 LTS o una versión posterior de la rama 26.x; `.nvmrc` y `.node-version` fijan 26.13.0. No necesitas mise ni prefijos para arrancar si Node 26 ya está activo en tu terminal. No se modifica el Node del sistema.

## Instalación desde cero

```bash
cp .env.example .env
pnpm install
pnpm --filter @uni/shared build
pnpm --filter api db:migrate
pnpm --filter api user:create --username desarrollo --display-name 'Desarrollo local' --random-password
```

`--random-password` genera, protege con Argon2id y descarta una contraseña fuerte. Para usar un usuario/contraseña elegido por ti, omite esa opción: la CLI pide la contraseña de forma oculta y su confirmación. Nunca se pasan contraseñas como argumentos ni se imprimen.

Para entrar sin escribir credenciales, configura explícitamente en `.env`:

```env
NODE_ENV=development
AUTH_PROVIDER=local
APP_HOST=127.0.0.1
APP_ORIGIN=http://localhost:5173
DEV_ACCESS_ENABLED=true
DEV_ACCESS_USERNAME=desarrollo
```

```bash
npm run dev
```

Desde la raíz, este único comando comprueba Node y el binario nativo de SQLite, compila y levanta shared, API y web. Si `better-sqlite3` conserva un binario de otro Node, lo reconstruye automáticamente antes de arrancar; no abre ni modifica la base durante esa comprobación. La reparación requiere conexión para descargar el binario o herramientas C/C++ si debe compilarse. Si falla, el comando se detiene con el error en lugar de dejar solo la web levantada por un fallo nativo. `pnpm dev` ejecuta el mismo flujo. Mantén la terminal abierta y usa Ctrl+C para detenerlo. No ejecutes dos instancias en los mismos puertos.

En desarrollo con proveedor `local` y API enlazada a `127.0.0.1` o `::1`, no se aplican límites de peticiones, incluido el acceso de desarrollo. En producción, con LDAP o fuera de loopback, se conservan los límites globales y de login. Sesión, roles, origen y CSRF siguen siendo obligatorios.

Los usuarios nuevos tienen rol `USER`. Tras entrar por primera vez, opcionalmente promociona la cuenta desde otra terminal:

```bash
pnpm --filter api admin:promote --username desarrollo
```

La CLI muestra la identidad y exige escribir su usuario exacto antes de aplicar el cambio. Revoca todas sus sesiones y registra auditoría. Vuelve a entrar para obtener el rol actualizado. No hay endpoint HTTP de bootstrap administrativo. No repitas el alta si la cuenta ya existe.

Para deshabilitar el botón, configura `DEV_ACCESS_ENABLED=false` y reinicia. El login por credenciales seguirá disponible. El rol no puede elegirse desde el navegador.

## Direcciones y páginas

- Web: http://localhost:5173.
- API: http://127.0.0.1:3000/api/v1.
- Swagger: http://127.0.0.1:3000/api/docs (solo desarrollo).
- Inicio según rol: `/app/tickets` para USER; `/staff/dashboard` o `/admin/dashboard` para el personal.
- Solicitudes propias para cualquier rol: `/app/tickets`, `/app/tickets/new`, `/app/tickets/:id`.
- Atención: `/staff/tickets`, `/staff/tickets/:id` o sus equivalentes `/admin/tickets` y `/admin/tickets/:id`.
- Administración: `/admin/departments`, `/admin/categories`, `/admin/users` y `/admin/audit`.
- Notificaciones: `/app/notifications`, `/staff/notifications`, `/admin/notifications`.
- Comprobación de permisos: `/staff/access` (técnicos/admin) y `/admin/access` (admin).

USER abre sus tickets; TECHNICIAN y ADMIN abren sus resúmenes de atención reales. Vite proxifica `/api`, de modo que el navegador usa un mismo origen para cookies y CSRF. No abras la SPA con otro host sin cambiar `APP_ORIGIN`. No publiques el acceso de desarrollo en LAN/VPN ni mediante un túnel o reverse proxy.

## Portal de solicitudes (fase 4)

- **Mis solicitudes → Nueva solicitud**: selecciona una categoría activa, escribe título y descripción. El backend obtiene el solicitante de la sesión y el departamento de la categoría. Se genera `UNI-000001`, etc., dentro de una transacción con su evento y las notificaciones administrativas pertinentes.
- La lista permite buscar por número/título/descripción y filtrar estado. Listados, comentarios e historial tienen paginación real: 20 por defecto, máximo 100.
- El detalle muestra estado, prioridad actual, departamento, categoría, fechas, descripción, conversación pública e historial seguro. Solo puedes consultar tus tickets: también ADMIN/TECHNICIAN usan este portal con alcance propio. La bandeja del personal usa rutas distintas, con alcance de departamento para técnicos y global para administradores.
- Los comentarios son públicos; no se aceptan notas internas desde el portal. Si el estado es `WAITING_USER`, tu respuesta lo cambia automáticamente a `IN_PROGRESS`.
- Un ticket `RESOLVED` permite confirmar el cierre o reabrirlo durante los siete días posteriores a `resolvedAt`. Cerrado (`CLOSED`) es de solo lectura y no se reabre desde este portal. El plazo se valida nuevamente en el servidor, no solo mediante botones.

**Resolución real:** el técnico responsable o un administrador puede resolver desde el panel de atención. El solicitante puede entonces cerrar o reabrir desde su portal. No existe un endpoint de depuración ni un botón de resolución simulada.

Las notas internas, metadatos de personal y relaciones de tareas nunca se incluyen en las respuestas públicas. El historial solo permite tipos públicos y estados conocidos; no devuelve el JSON bruto ni la identidad del actor interno. Las notificaciones de alta se guardan para administradores activos distintos del solicitante; se visualizan ahora en la campana y la página personal de notificaciones.

## Bandeja de tickets y asignaciones propias

El detalle de **Mis solicitudes**, **Todos los tickets** y **Mis tickets** incluye un **chat en vivo** entre el solicitante y el personal autorizado, con historial guardado en SQLite. Se reutiliza el WebSocket de la sesión y la API protegida. Las notas internas permanecen privadas y los tickets cerrados son de solo lectura. [Uso y límites del chat](docs/ticket-chat.md).

En el sidebar de ADMIN y TECHNICIAN, **Bandeja de tickets** despliega **Todos los tickets** y **Mis tickets**. Esta última muestra los asignados a la cuenta de la sesión, con filtros y paginación del servidor dentro de su alcance autorizado. Rutas directas: `/admin/tickets/mine` y `/staff/tickets/mine`.

**Mis solicitudes** sigue siendo el portal de tickets creados por ti, no tus asignaciones. El desplegable admite teclado, sidebar plegado y menú móvil. Ver [verificación](docs/verification/assigned-tickets.md).

Ambas bandejas incluyen búsqueda con pausa al escribir, filtros de estado/prioridad, **Más filtros** para departamento/categoría/responsable y etiquetas para quitar filtros individualmente. Los totales y la paginación respetan los filtros del servidor. Todos los selectores de la aplicación utilizan shadcn/ui sobre Radix, también en formularios y diálogos; ver [evidencia visual](docs/verification/selects-ticket-inbox.md).

## Kanban privado (fase 6)

1. Entra como ADMIN y abre **Tableros → Nuevo tablero**. Selecciona un departamento activo. Se crean Pendiente, En progreso, En revisión y Completado; no hay tableros ni tareas precargados.
2. En **Administrar tablero**, añade técnicos activos que pertenezcan al departamento. `VIEW` consulta, `EDIT` crea/edita/mueve tareas y comenta, `MANAGE` además configura columnas y miembros. ADMIN tiene acceso global. Un técnico del departamento sin pertenencia al tablero recibe 404.
3. Crea tareas con título, descripción, prioridad, columna, responsables y fecha límite opcional. Solo se asignan miembros explícitos activos y elegibles; para asignar un ADMIN también hay que incorporarlo explícitamente.
4. Arrastra desde el asa de puntos a una columna o sobre otra tarjeta para ordenarla. La actualización es optimista; el servidor valida y devuelve el orden canónico. Un error restaura la posición. También puedes usar **Mover tarea sin arrastrar** dentro del detalle.
5. Abre una tarea para editar, asignar responsables, comentar, gestionar checklist y consultar su historial privado. Las fechas se guardan como milisegundos UTC y se presentan en hora local. La columna es su estado; no existe un segundo `status`.
6. Configura/reordena columnas desde la administración del tablero. No se pueden eliminar columnas con tareas, incluidas las archivadas. Archivar tarea o tablero conserva datos e historial y los deja de solo lectura.
7. Retirar un miembro revoca su acceso y desasigna sus tareas activas en una transacción; las asignaciones históricas archivadas se conservan. Incluso en un tablero archivado se permite retirar miembros para revocar acceso. Retira primero estas pertenencias antes de eliminar al técnico del departamento.

Rutas: `/admin/boards`, `/admin/boards/:id`, `/staff/boards`, `/staff/boards/:id`. Ningún USER accede a los endpoints de tableros, tareas, comentarios, checklist o historial. Las relaciones privadas de fase 7 se describen a continuación. Las notificaciones de asignación se guardan y aparecen en vivo para el destinatario autorizado.

## Tickets y tareas vinculados (fase 7)

- En **Atención de tickets → detalle**, usa **Crear tarea a partir de este ticket**. Selecciona un tablero autorizado del mismo departamento; título y descripción del ticket aparecen como valores iniciales editables. La tarea y el vínculo se guardan en una sola transacción, sin cambiar el estado del ticket.
- Desde el mismo detalle puedes **Vincular tarea existente**. Las tareas relacionadas abren directamente su panel en el tablero, mediante `?taskId=...`.
- El panel de tarea muestra **Tickets asociados · Privado**; permite consultar, incorporar y desvincular tickets existentes. Es una relación muchos-a-muchos, con historial en la tarea y auditoría. Desvincular no elimina ninguna entidad.
- Lectura exige acceso a ambos recursos; los listados y sus totales no revelan tareas de tableros ajenos. Para escribir necesitas EDIT/MANAGE del tablero y ser el técnico responsable del ticket o ADMIN. VIEW solo consulta. CLOSED no admite cambios de vínculos.
- No se permiten vínculos entre departamentos distintos. Para trasladar un ticket a otro departamento, retira primero sus vínculos; de lo contrario devuelve 409. Se permite retirar vínculos de tareas/tableros archivados como revocación privada, conservando historial; no crear vínculos nuevos en ellos.
- El portal `/app/tickets` y sus endpoints públicos nunca muestran tareas, vínculos, IDs internos de tareas ni sus eventos. No hay automatización que cierre un ticket al completar una tarea.

API interna: GET/POST `/staff/tickets/:id/tasks`, GET/POST `/tasks/:id/tickets`, DELETE `/tasks/:id/tickets/:ticketId`. Migración `0006_task_ticket_links.sql`; siete migraciones en total. La tabla conserva referencias a tarea, ticket y autor del vínculo, con PK compuesta e índice inverso por ticket.

## Atención interna (fase 5)

1. Abre **Atención de tickets**. Busca por número/título/descripción y filtra departamento, categoría, prioridad, estado y responsable, o selecciona **Sin asignar**. La paginación se aplica en SQLite.
2. ADMIN abre el detalle y elige un técnico activo del departamento en **Responsable**. La primera asignación lleva OPEN a ASSIGNED. Elegir **Sin asignar** retira el responsable; ASSIGNED vuelve a OPEN. Otros estados conservan su significado.
3. El técnico responsable abre el detalle, cambia a **En progreso**, establece prioridad y envía una **Respuesta pública** o una **Nota interna**. Otros técnicos del mismo departamento pueden consultar, pero no modificar tickets ajenos a su asignación. Un departamento ajeno recibe 404.
4. **Esperando usuario** solicita información; una respuesta del solicitante retoma **En progreso**. El responsable puede resolver; el solicitante confirma cierre o reabre dentro de siete días. CLOSED es de solo lectura, también para ADMIN.
5. ADMIN puede resolver directamente un ticket pendiente. El historial registra la transición. El personal autorizado puede reabrir un RESOLVED desde su panel; el límite de siete días corresponde al portal del solicitante.
6. ADMIN puede reasignar departamento y categoría activos, seleccionando un técnico compatible o dejando **Sin asignar**. Se valida todo en una transacción, y el personal del departamento anterior pierde acceso inmediatamente. En la API, omitir `assignedToId` en el traslado elimina la asignación anterior.
7. **Resumen** muestra conteos reales por estado, departamento y prioridad. **Sin asignar pendientes** y **Mis asignadas pendientes** excluyen RESOLVED/CLOSED. Los técnicos ven sus departamentos; ADMIN ve el conjunto global. **Mis tareas pendientes** cuenta tareas asignadas a ti, no archivadas, en tableros accesibles y columnas no completadas.

Se guardan eventos y auditoría de asignaciones, traslados, prioridades, estados y mensajes. Auditoría/eventos no copian el texto de las notas. Las asignaciones, respuestas públicas y cambios de estado guardan notificaciones en la misma transacción; las notas internas no notifican al solicitante. La campana y la página de notificaciones consultan exclusivamente los avisos del destinatario con sus permisos actuales.

## Administración (fase 3)

1. En **Departamentos**, crea un nombre y un slug único. Puedes editarlo, desactivarlo y abrir **Técnicos** para gestionar pertenencias.
2. En **Usuarios**, busca por nombre, correo o usuario; cambia un usuario a `TECHNICIAN` antes de incorporarlo a un departamento. Los usuarios institucionales aparecen tras su primer login; no hay alta AD desde la web.
3. En **Categorías**, selecciona un departamento activo y registra la categoría. Nombre, slug, descripción y activación son editables. El departamento se mantiene fijo para no alterar el significado histórico; crea otra categoría si cambia su destino.
4. En **Auditoría**, consulta los cambios, su actor, fecha y valores anteriores/nuevos. Es de solo lectura y exclusivo de ADMIN.

Los listados tienen búsqueda, filtros y paginación real (20 por defecto, máximo 100). La desactivación conserva datos y relaciones; el catálogo de solicitudes oculta categorías inactivas o cuyo departamento esté inactivo.

No se puede desactivar ni degradar al último administrador activo. Los cambios de rol o activación invalidan sus sesiones y se auditan en la misma transacción. Retira las pertenencias de un técnico antes de convertirlo en USER. Solo técnicos activos pueden incorporarse a departamentos activos; desactivar un usuario no borra sus pertenencias. No se retira a un técnico de un departamento mientras tenga tickets no cerrados asignados en él: deben reasignarse primero desde el panel de atención.

Las cuentas `tecnico-local` y `usuario-local`, los departamentos y las categorías presentes en esta máquina se crearon explícitamente durante la comprobación funcional **local**, no representan datos institucionales ni forman parte de semillas o respuestas hardcodeadas. En una instalación limpia las tablas están vacías. Para trabajar con otros usuarios locales, usa la CLI documentada, eligiendo su contraseña de forma oculta si necesitas login por credenciales.

## Seguridad y autenticación

- Proveedor local de desarrollo con contraseñas Argon2id; proveedor LDAP directo por **LDAPS verificado**, sin fallback inseguro.
- Identidad AD estable por `objectGUID`; el login actualiza atributos descriptivos y conserva roles, activación local y pertenencias.
- Sesiones persistentes con token aleatorio de 32 bytes; SQLite guarda únicamente hashes SHA-256 de sesión y CSRF. Cookie HttpOnly, SameSite=Lax, Path=/, sin Domain; Secure y prefijo `__Host-` en producción.
- Inactividad máxima 8 horas y límite absoluto 24 horas. Logout revoca; login rota la sesión previa del navegador; promoción invalida sesiones del usuario.
- Todas las operaciones de escritura exigen origen exacto y CSRF. Login también tiene protección CSRF y limitación de peticiones.
- Roles y sesiones comprobados por NestJS en cada solicitud. React también protege sus rutas y retira datos privados al salir.
- Revalidación periódica de cuentas AD (5 minutos por defecto), fallando de forma segura si no es posible consultar el directorio cuando corresponde.

La integración LDAP está implementada, pero **no se ha probado contra el dominio institucional**: faltan FQDN, cuenta de lectura, CA, DNS/firewall y LDAPS habilitado. Los pasos administrativos son externos: [Active Directory](docs/active-directory.md). Producción rechaza proveedor local, entrada de desarrollo y bases con identidades locales. No traslades la base de desarrollo a producción.

## Persistencia y migraciones

`DATABASE_URL=./data/university.sqlite` se resuelve respecto de `apps/api` en los comandos filtrados. Se carga `.env` raíz; las variables del proceso tienen prioridad. Nunca guardar credenciales, cookies, certificados privados ni SQLite en Git.

```bash
pnpm --filter api db:generate
pnpm --filter api db:migrate
```

Versionar `apps/api/drizzle`; no usar `drizzle-kit push` para producción. Respaldar consistentemente antes de migrar (Online Backup API, no copiar solamente el archivo principal durante escrituras WAL).

La migración de identidad añade usuarios, credenciales, sesiones y auditoría. La fase 3 añade las categorías y el índice de pertenencias por usuario; las pantallas administrativas trabajan sobre estas tablas reales. La fase 4 añade tickets, contador, comentarios, eventos y almacenamiento de notificaciones. Las migraciones no incorporan usuarios ni entidades de ejemplo; el contador se inicializa al crear el primer ticket. La fase 5 reutiliza este esquema sin migración vacía. La fase 6 añade ocho tablas de Kanban con `0005_internal_kanban.sql`, incluido `task_events` para historial real y una FK compuesta que impide colocar una tarea en una columna de otro tablero. La fase 7 añade `task_ticket_links` mediante `0006_task_ticket_links.sql`. La fase 8 reutiliza `notifications` y las tablas existentes: no añade migraciones vacías. Total actual: siete migraciones; no utilizar `drizzle-kit push`.

## Compilación y comprobaciones

```bash
pnpm build
pnpm typecheck
curl http://127.0.0.1:3000/api/v1/health
```

Las comprobaciones funcionales son manuales, sin suites de tests. Compilar no demuestra conexión a AD ni despliegue institucional. El registro detalla lo comprobado y las dependencias externas pendientes.

## Organización

- `apps/api/src/database`: conexión Drizzle/SQLite, esquemas y repositorios; `unit-of-work.ts` coordina transacciones de escritura compartidas por servicios.
- `apps/api/src/modules/auth`: proveedores, servicios de negocio y sesiones; controlador de autenticación.
- `apps/api/src/common`: validación Zod, respuestas/errores, Guards y decoradores.
- `apps/api/src/scripts`: migraciones, alta local y promoción administrativa.
- `apps/web/src/features/auth`: login conectado, acceso local, perfil y verificación de permisos.
- `apps/api/src/modules/tickets` y `apps/web/src/features/tickets`: portal completo de solicitudes propias; `TicketAccessPolicy` filtra por solicitante en backend.
- `apps/web/src/features/staff` y `modules/tickets/staff-tickets.*`: atención, notas privadas y resumen de tickets; `StaffTicketsRepository` limita consultas y estadísticas por departamento.
- `apps/api/src/modules/notifications` y `apps/web/src/features/notifications`: API personal, señal WebSocket postcommit, campana, historial y reconexión.
- `packages/shared/src`: enums, tipos y esquemas reutilizados por frontend/backend.
- `postman/specs` y `postman/collections`: contrato y peticiones locales sin mocks ni scripts de tests; nada publicado en cloud.

Vite consume el TypeScript de `@uni/shared` para ESM/HMR/tree-shaking; NestJS consume su compilación CommonJS. `pnpm dev` compila antes de iniciar los tres paquetes en watch.

La preparación de fase 9 está implementada. Consulta docs/progress.md para separar verificación local de Docker/HTTPS de la activación institucional pendiente (AD, DNS, certificados y firewall reales).

## Diseño de la interfaz

Tema oscuro permanente, sidebar shadcn/ui, React Hook Form y estado visual con Zustand.
Consulta [las decisiones y verificaciones del rediseño](docs/design.md).

### Vistas de tareas

Los tableros internos ofrecen vista **Tablero** y **Lista**, filtros combinables, ordenación y categorías privadas por tablero. Consulta [uso y permisos](docs/kanban-views.md) y [verificación local](docs/verification/kanban-views.md).

### Estado de servicios universitarios

Sidebar **Estado de servicios**: catálogo para usuarios y técnicos; administración
puede crear servicios, informar estados y gestionar notas públicas o internas
(solo ADMIN). Tickets con vínculo opcional al servicio y acceso propio respetado.
No hay sondeos automáticos ni servicios de ejemplo precargados.
Ver [uso y permisos](docs/service-status.md).

### Planificación del trabajo

Los tableros incorporan fechas límite y señalización de atrasos, subtareas y
bloqueos informativos, plantillas reutilizables con checklist y vista Calendario
con agenda móvil y reparto de entregas por responsable. Todo se guarda en SQLite
con permisos del tablero. Ver [planificación](docs/task-planning.md).
