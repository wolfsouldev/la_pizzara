# Contexto de relevo — La Pizzara

**Fecha de elaboración:** 8 de noviembre de 2026.
**Proyecto:** `/home/astro/Proyectos/university-platform`.
**Objetivo:** permitir continuar el trabajo en otro chat sin reconstruir las decisiones, el estado y los límites del proyecto.

> Lee este documento y revisa los archivos actuales antes de cambiar código. El MVP está implementado y preparado para instalar; **no está acreditado un despliegue institucional ni un login contra el Active Directory real**. No confundas las verificaciones locales con aceptación de producción.

## 1. Qué estamos construyendo

Plataforma interna universitaria con dos áreas relacionadas:

- Help Desk: solicitudes de usuarios, atención por departamentos, asignación de técnicos, estados, prioridades, conversación pública e historial.
- Trabajo interno: tableros Kanban privados, tareas, responsables, checklist, comentarios, categorías y vínculos privados con tickets.

Administración de usuarios, roles, departamentos, categorías, miembros, auditoría, notificaciones y estadísticas reales. Identidad institucional mediante Active Directory con LDAPS; proveedor local independiente para desarrollo.

El nombre visible exacto elegido por el usuario es **La Pizzara**, con esa escritura. No corregirlo a «La Pizarra». Los nombres técnicos `university-platform`, archivo SQLite, cookies y claves de almacenamiento se conservaron para evitar romper compatibilidad.

## 2. Preferencias y reglas del usuario

1. Trabajar por fases y conservar lo anterior; no reconstruir todo ni cambiar el stack.
2. Código funcional con SQLite real: sin mocks, respuestas simuladas, semillas ficticias ni pantallas que aparenten funcionar.
3. TypeScript estricto. Persistencia con Drizzle; lógica de negocio en servicios y consultas en repositorios.
4. Permisos y validaciones obligatorios en backend, no solo botones ocultos.
5. No añadir suites automatizadas ni CI/CD. Sí compilar, aplicar migraciones y comprobar manualmente los flujos con datos reales.
6. No inventar infraestructura, credenciales, dominios ni direcciones. Parametrizar lo que falte.
7. Nunca desactivar TLS ni modificar automáticamente Active Directory.
8. **Oscuro permanente**, sin selector y sin depender del tema del sistema.
9. Sidebar de shadcn/ui; formularios con React Hook Form y Zod. Zustand únicamente cuando proceda para estado de interfaz, no para duplicar datos remotos.
10. Kanban con una experiencia inspirada en Linear/GitHub Projects: tablero, lista, filtros y categorías; no una copia exhaustiva de esos productos.
11. Mantener entrada cómoda de desarrollo para mirar el sistema; **nunca pública ni habilitada en producción**.
12. Evitar sobreingeniería y cambios fuera de lo pedido. Commits por funcionalidad; no alterar fechas ni fingir historia de desarrollo.

### Cambios expresos frente al plan inicial

- Aunque el plan inicial aplazaba WebSockets, el usuario pidió notificaciones en vivo: **se implementó Socket.IO sobre WebSocket** con reconciliación HTTP. No eliminarlo por volver a leer la especificación original.
- El tema claro inicial fue sustituido por oscuro permanente a petición del usuario.
- Se incorporó Zustand para la preferencia de sidebar, no Redux ni un almacén global de entidades.
- Se añadieron vistas/lista y categorías internas por tablero después del MVP inicial.

## 3. Stack y arquitectura actual

| Área | Implementación |
| --- | --- |
| Monorepo | pnpm workspaces, `apps/api`, `apps/web`, `packages/shared` |
| Runtime | Node **24.15.0**; pnpm **12.15.0**; engines exige Node `>=24 <25` |
| API | NestJS 11, Express, TypeScript estricto, Zod, Swagger, throttling |
| Persistencia | Drizzle ORM / Drizzle Kit / better-sqlite3; migraciones versionadas |
| Frontend | React 19, Vite 7, Tailwind 4, shadcn/ui y Radix |
| Datos/formularios | TanStack Query; React Hook Form y Zod |
| Interacción | React Router, `@dnd-kit/react`, Lucide, date-fns |
| Identidad | ldapts para LDAPS; Argon2id exclusivamente para cuentas locales de desarrollo |
| Sesión | Tokens opacos aleatorios, hash persistido en SQLite, cookies HttpOnly y CSRF |
| Tiempo real | Socket.IO, misma API, sin servicio adicional |
| Despliegue | Docker Compose con `caddy`, `web`, `api` |

Una sola API y una sola SQLite en disco local. PRAGMA WAL, claves foráneas activas y `busy_timeout=5000`. No compartir la base entre servidores ni almacenarla en NFS/SMB/tmpfs. No usar JWT, Prisma, Redis, colas, Keycloak o Firebase.

Las versiones exactas resueltas están en `pnpm-lock.yaml`; no actualizarlas indiscriminadamente como parte de otro ajuste.

## 4. Qué se implementó por fase

| Fase | Resultado |
| --- | --- |
| 0 | Variables, separación local/producción y dependencias externas documentadas. |
| 1 | Monorepo, API, frontend, shared, conexión SQLite, health, validación y errores. |
| 2 | Identidad local/LDAP, sesiones, cookies, CSRF, login/logout, Guards, roles y CLI. |
| 3 | Departamentos, categorías, usuarios, roles, activación, pertenencias y auditoría. |
| 4 | Portal de tickets propios, numeración correlativa, comentarios, historial, cierre/reapertura. |
| 5 | Bandeja de atención, filtros y alcance por departamento, asignación, estados, prioridades y notas internas. |
| 6 | Tableros privados, permisos, columnas, tareas, movimientos persistentes, responsables, checklist, comentarios e historial. |
| 7 | Vinculación privada tickets/tareas, incluida creación de tarea desde ticket. |
| 8 | Notificaciones persistentes en vivo, campana, historial, marcado y dashboards reales. |
| 9 | Imágenes Docker, Compose, Caddy/HTTPS, migraciones operativas, backup/restauración y guías LDAPS. Instalación institucional pendiente. |

Después: rediseño oscuro, sidebar responsive, marca/iconos/favicon, vistas Kanban/lista y categorías por tablero, limpieza de Git e historial modular.

## 5. Identidad, sesiones y seguridad: no romper

- Roles globales: `USER`, `TECHNICIAN`, `ADMIN`, `SUPER_ADMIN`. En LDAP, pertenecer a `Domain Admins` (membresía directa o grupo primario RID 512) da `ADMIN`; las demás cuentas, incluidas las de `Domain Users`, son `USER`, salvo un `TECHNICIAN` ya establecido. `SUPER_ADMIN` se concede solo por CLI, no por grupo AD ni por endpoint web.
- Usuarios institucionales aparecen al iniciar sesión correctamente. Identidad estable AD por `objectGUID`, no por correo o nombre de usuario.
- En cada login LDAP se deriva `ADMIN`/`USER` de `Domain Admins` y se reconcilia también durante sesiones activas; `SUPER_ADMIN` permanece como elevación manual y se conserva `TECHNICIAN` ya establecido salvo que la cuenta pertenezca a `Domain Admins`. La sincronización de atributos conserva pertenencias y el bloqueo local.
- LDAPS verifica certificado, cadena y FQDN. Cuenta de lectura busca coincidencia única; otra conexión cifrada valida el bind del usuario. Se cierran conexiones al terminar.
- Hay comprobación periódica del estado de la cuenta AD. Si caduca la comprobación y no se puede validar el directorio, se falla de forma segura.
- Las contraseñas AD no se persisten. No introducir `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0` ni LDAP simple.
- Sesiones propias: token de 32 bytes y hash SHA-256 en SQLite. Cookie `uni.sid` local y `__Host-uni.sid` en producción; HttpOnly, SameSite=Lax, Secure en producción, Path=/, sin Domain.
- Inactividad predeterminada 8 horas y duración absoluta 24. Logout revoca; cambios de privilegios invalidan sesiones.
- Mutaciones protegidas con origen estricto y token CSRF; no almacenar tokens de sesión en localStorage.
- Proxy de confianza restringido al Caddy configurado; nunca confiar indiscriminadamente en proxies.
- No permitir degradar/desactivar al último `ADMIN` activo. `SUPER_ADMIN` se concede solo por CLI y no se puede modificar desde la web.
- Alta local y promoción a `SUPER_ADMIN` por CLI, no registro público ni bootstrap HTTP.

### Entrada de desarrollo y administración elevada

El botón **Entrar en desarrollo** crea una sesión real de una cuenta local previamente registrada. No es un bypass general de Guards ni permite elegir rol desde el navegador.

Requiere desarrollo, proveedor local, API loopback, origen local y habilitación explícita. `.env.example` lo deja apagado. La cuenta `desarrollo` se había registrado y promocionado en esta máquina; no asumir que existe en un checkout nuevo.

**Producción rechaza proveedor local, entrada de desarrollo e identidades locales en la base. No llevar SQLite ni usuarios de desarrollo al servidor institucional.**

## 6. Reglas de negocio que ya existen

### Tickets

- Categoría activa determina departamento; solicitante sale de sesión. Inicialmente `OPEN`, prioridad `NORMAL`, sin responsable.
- Número público `UNI-000001` correlativo transaccional; UUID técnico separado.
- Portal propio limitado al solicitante, incluso si quien lo usa tiene rol ADMIN/TECHNICIAN/SUPER_ADMIN. El personal utiliza endpoints internos distintos.
- Técnicos consultan solo sus departamentos. Las mutaciones de atención exigen las condiciones de responsabilidad correspondientes; `SUPER_ADMIN` asigna/reasigna y cambia departamento. ADMIN ordinario no accede a la bandeja interna.
- Estados: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_USER`, `RESOLVED`, `CLOSED`. Prioridades: `LOW`, `NORMAL`, `HIGH`, `URGENT`.
- Cerrado es de solo lectura. El solicitante puede cerrar un resuelto o reabrirlo dentro de siete días desde resolución; no reabre un cerrado.
- Comentario del solicitante en `WAITING_USER` cambia a `IN_PROGRESS`.
- Notas internas, metadatos privados y tareas vinculadas nunca se devuelven en el portal público.
- Cambios relevantes, eventos y notificaciones se escriben de forma transaccional.

### Tableros y tareas

- `VIEW`: lectura; `EDIT`: crear/editar/mover/comentar; `MANAGE`: además configurar columnas, miembros y categorías. `SUPER_ADMIN` tiene acceso global.
- Pertenecer al departamento no concede acceso al tablero: técnico necesita pertenencia explícita elegible. USER y ADMIN ordinario no acceden a datos internos.
- Columnas iniciales: Pendiente, En progreso, En revisión, Completado. No eliminar una columna con tareas, incluidas archivadas.
- La columna representa el estado de tarea: no añadir un segundo `status` independiente.
- Movimientos/reordenamiento transaccionales, posiciones enteras espaciadas y normalización. El backend devuelve el orden canónico; React hace mutación optimista con rollback.
- No aceptar `boardId`, `columnId` o `position` arbitrarios desde PATCH genérico. No mover entre tableros mediante el movimiento ordinario.
- Responsables elegibles del tablero; los técnicos necesitan pertenencia correspondiente y la aplicación restringe las tareas internas a técnicos autorizados y `SUPER_ADMIN`.
- Archivado conserva historial y deja recursos de solo lectura, con excepciones explícitas para revocar acceso/desvincular.
- Tickets y tareas pueden vincularse muchos-a-muchos solo dentro del mismo departamento, con acceso a ambos recursos y permisos de escritura. Trasladar ticket con vínculos incompatibles devuelve conflicto.
- Notificaciones pertenecen a su destinatario y vuelven a comprobar acceso a recursos privados.

## 7. Última ampliación: Kanban tipo Linear/GitHub

- Vista **Tablero** con drag-and-drop y vista **Lista** con cambio de columna y orden manual.
- Búsqueda y filtros combinables por estado, prioridad, responsable, categoría y archivo; orden por posición/título/prioridad/fecha según vista.
- Preferencias de vista/filtros en URL, recuperables al recargar/compartir enlace; no un sistema de vistas compartidas independiente.
- Categorías internas propias del tablero, distintas de las categorías Help Desk. Varias categorías por tarea, creación/edición/eliminación real y auditoría.
- Nombres únicos por tablero ignorando mayúsculas, máximo 100 categorías por tablero y 20 por tarea. Colores `violet`, `blue`, `green`, `amber`, `rose`, `gray`.
- Eliminar categoría elimina asociaciones, no tareas.
- PATCH parcial: omitir `labelIds` conserva selección; `[]` la borra. Omitir prioridad la conserva. No reutilizar defaults de creación en PATCH.
- Arrastre con filtros calcula índice sobre el orden completo autorizado, incluidas tareas ocultas; no calcular posición solo con tarjetas visibles.
- Flechas de orden en lista solo con orden del tablero, para evitar ambigüedad al ordenar por otros campos.

Persistencia añadida: `board_labels`, `task_labels`; migración `0007_ambitious_ted_forrester.sql`.

Rutas añadidas: GET/POST `/api/v1/boards/:id/labels` y PATCH/DELETE `/api/v1/boards/:id/labels/:labelId`. TaskCreate/TaskPatch y creación desde ticket aceptan `labelIds`; DTO interno devuelve `labels`.

Archivos principales:

- `apps/web/src/features/boards/BoardPage.tsx`: página, URL, filtros y mutaciones.
- `apps/web/src/features/boards/TaskViews.tsx`: tablero, tarjetas y lista.
- `apps/web/src/features/boards/BoardLabels.tsx`: badges y gestión de categorías.
- `apps/web/src/features/boards/kanban.ts`: consultas y utilidades de movimiento.
- `apps/web/src/features/tasks/TaskForm.tsx` y `TaskPanel.tsx`: creación/detalle/edición.
- `docs/kanban-views.md` y `docs/verification/kanban-views.md`: comportamiento y evidencia.

## 8. Diseño y marca

Oscuro grafito desde HTML inicial; tokens semánticos en `apps/web/src/styles/globals.css`. No añadir selector ni tema claro.

Sidebar shadcn/Radix: plegable escritorio, Sheet móvil, grupos por área/rol, tooltips y Cmd/Ctrl+B sin capturar escritura en inputs. Zustand conserva solo preferencia de sidebar con clave `campus-workspace-ui`; sesión y datos siguen en TanStack Query.

Marca vectorial original: pizarra y porción de pizza, fondo lavanda, trazos oscuros y acento amarillo. Recursos `apps/web/public/brand-mark.svg`, `favicon.svg`, PNG para móvil/iconos y `site.webmanifest`. Componente `apps/web/src/components/brand/BrandLogo.tsx`.

Se cuidaron foco, contraste, campos etiquetados, errores, estados vacíos, controles móviles y scroll interno de tablas/tablero. No dedicar la siguiente ronda a animaciones decorativas ni rebranding no solicitado.

## 9. Mapa del repositorio y contratos

- `apps/api/src/database`: conexión, esquemas y repositorios Drizzle.
- `apps/api/src/modules`: auth, access, departments, categories, users, audit, administration, tickets, notifications, boards, tasks y task-links, además de health.
- `apps/api/src/common`: Guards, políticas y utilidades transversales.
- `apps/api/src/scripts`: usuarios locales, promoción, migraciones, backups, restauración y comprobación AD.
- `apps/api/drizzle`: migraciones versionadas `0000` a `0011`, más metadatos. Versionarlas; no usar `drizzle-kit push` para producción.
- `apps/web/src/app`: router, providers y layouts USER/TECHNICIAN/ADMIN/SUPER_ADMIN.
- `apps/web/src/features`: pantallas conectadas por funcionalidad.
- `packages/shared/src`: contratos, enums, tipos y Zod compartidos.
- `infra`: Docker Compose, Caddy, ejemplos de entorno y scripts operativos.
- `postman/specs/platform.openapi.json`: contrato actual v1.14.0.
- `postman/collections/University Phase 8`: colección manual acumulada de 82 peticiones; `Kanban categories`: cuatro peticiones adicionales.

API bajo `/api/v1`, éxito `{ data }`, listados `{ data, meta }`, error `{ error: { code, message } }`. Paginación predeterminada 20, máximo 100. Swagger en desarrollo `/api/docs`.

`AGENTS.md` exige leer `postman/skills/api-builder/SKILL.md` antes de trabajo API no trivial. No ejecutar escrituras de colecciones sin preparar IDs reales, sesión/CSRF y entorno autorizado. Las colecciones no son mocks ni una suite automatizada.

## 10. Cómo levantarlo en local

Desde la raíz del repositorio, con Node 24 seleccionado. En esta máquina se ha utilizado mise; no usar el Node del sistema si está fuera de engines.

```bash
cd /home/astro/Proyectos/university-platform
node --version
# Con mise, prefijar los comandos así:
mise exec node@24.15.0 -- pnpm install --frozen-lockfile
```

Crear `.env` a partir del ejemplo **solo si no existe**, sin sobrescribir configuración privada:

```bash
cp .env.example .env
mise exec node@24.15.0 -- pnpm --filter @uni/shared build
mise exec node@24.15.0 -- pnpm --filter api db:migrate
```

Si se necesita una cuenta nueva:

```bash
mise exec node@24.15.0 -- pnpm --filter api user:create --username desarrollo --display-name 'Desarrollo local'
```

La CLI pide contraseña oculta y confirmación. `--random-password` genera/protege/descarta una contraseña fuerte y sirve para una cuenta que usará el acceso explícito de desarrollo; no imprime una contraseña recuperable. No repetir el alta de una cuenta existente.

Para habilitar el botón local, editar el `.env` ignorado:

```env
NODE_ENV=development
AUTH_PROVIDER=local
APP_HOST=127.0.0.1
APP_ORIGIN=http://localhost:5173
DEV_ACCESS_ENABLED=true
DEV_ACCESS_USERNAME=desarrollo
```

```bash
mise exec node@24.15.0 -- pnpm dev
# Opcional, desde otra terminal, para una cuenta existente:
mise exec node@24.15.0 -- pnpm --filter api superadmin:promote --username desarrollo
```

La promoción `SUPER_ADMIN` exige confirmar el usuario exacto, audita y revoca sesiones; volver a entrar. La web no puede asignar ni modificar SUPER_ADMIN. `ADMIN` ordinario administra departamentos, categorías y estado público de servicios; usuarios/roles, auditoría, bandeja interna, tableros privados y notas internas requieren SUPER_ADMIN. Técnicos conservan su alcance por departamentos y permisos explícitos.

- SPA: `http://localhost:5173`.
- API: `http://127.0.0.1:3000/api/v1`.
- Health: `http://127.0.0.1:3000/api/v1/health`.
- Swagger desarrollo: `http://127.0.0.1:3000/api/docs`.
- SQLite habitual: `apps/api/data/university.sqlite`; `DATABASE_URL=./data/university.sqlite` es relativo al directorio API.
- Vite proxifica `/api` y WebSocket; mantener host/origen coherentes con CSRF.

`pnpm dev` compila primero y después levanta watchers shared/API/web. **Este documento no afirma que haya procesos activos ahora**; comprobar puertos y propietarios antes de arrancar o parar nada. No matar procesos desconocidos ni reutilizar IDs de sesiones de herramientas de chats anteriores.

### Páginas útiles

- `/login`; raíz redirige por rol.
- `/app/tickets`, `/app/tickets/new`, `/app/tickets/:id`, notificaciones y perfil.
- `/staff/dashboard`, `/staff/tickets`, `/staff/boards`, detalles, notificaciones y perfil.
- Equivalentes `/admin/...`, además `/admin/departments`, `/admin/categories`, `/admin/users`, `/admin/audit`.
- `/staff/access` y `/admin/access` comprueban permisos mediante rutas protegidas reales.

## 11. Notificaciones en vivo

Socket.IO utiliza `/api/v1/realtime`, autenticación por sesión y validación de origen/permisos. La señal en vivo provoca recuperación autenticada HTTP: no difunde datos privados indiscriminadamente. Hay reconciliación al reconectar y cada 30 segundos.

Campana con contador/últimos avisos, historial paginado y marcado individual/global. Avisos por nuevas solicitudes, asignaciones, respuestas públicas y cambios relevantes; no enviar notas internas al solicitante ni notificar al propio autor innecesariamente. Dashboard consulta SQLite real y tareas pendientes autorizadas.

Ver `docs/realtime.md` antes de tocar protocolo, reconexión o proxy WebSocket.

## 12. Despliegue: preparado, no instalado institucionalmente

Guía completa: **`docs/deployment.md`**. Esta sección resume, no sustituye comprobaciones ni permisos del servidor.

Tres servicios; solo Caddy publica puertos en interfaz LAN/VPN configurada. API UID/GID 1000, base/copias en disco local privado, certificados y contraseña AD montados por archivo. Imágenes multietapa con Node 24.15.0 y Caddy 2.11.7. Frontend compilado, no Vite público.

1. Servidor Linux con Docker Engine/Compose plugin y DNS interno.
2. Certificado LDAPS válido en DC: Server Authentication, FQDN correcto, cadena confiable y puerto 636 accesible. Preparación administrativa externa.
3. Cuenta de lectura mínima, DN base y CA pública AD. Nunca exportar clave privada del controlador ni pedir Domain Admin para el servicio.
4. HTTPS web con certificado institucional o Caddy internal y distribución de su raíz pública a clientes.
5. Firewall/rutas LAN/VPN: verificar desde cliente autorizado y no autorizado; bind de interfaz no sustituye firewall. Considerar DNAT de Docker, no asumir que UFW cubre todo.
6. Base institucional nueva, sin datos locales ni modo demo.

```bash
cp infra/env/production.env.example infra/env/production.env
chmod 600 infra/env/production.env
sudo install -d -o 1000 -g 1000 -m 700 \
  /var/lib/university-platform/data /var/lib/university-platform/backups
sudo install -d -m 700 \
  /var/lib/university-platform/secrets /var/lib/university-platform/certs/web
```

Completar datos reales: `APP_DOMAIN`, `APP_ORIGIN` HTTPS exacto, `PUBLIC_BIND_IP`, `APP_SUBNET`, `APP_DYNAMIC_RANGE`, `CADDY_IPV4`, rutas de datos/copias/certificados, `AD_URL`, `AD_BASE_DN`, `AD_BIND_DN`, `AD_CA_CERT_FILE`, `AD_BIND_PASSWORD_FILE`. La IP fija de Caddy queda dentro de la subred y fuera del pool dinámico; no solapar redes LAN/VPN. Proxy confía solo en ese Caddy.

El secreto AD debe ser legible solo por su propietario UID 1000; usar consola segura siguiendo la guía, nunca argumentos, historial Git o chat. No configurar simultáneamente contraseña directa y archivo. CA AD y certificado web son cosas distintas.

```bash
./infra/scripts/compose.sh config --quiet
./infra/scripts/compose.sh build
./infra/scripts/compose.sh run --rm --no-deps api node dist/scripts/check-directory.js
./infra/scripts/compose.sh up -d --wait
./infra/scripts/compose.sh ps
./infra/scripts/compose.sh logs --tail=100 api caddy
```

`check-directory` valida TLS, bind de lectura y acceso base; **no prueba el login de un usuario institucional**. Tras primer login real, promocionar por consola y volver a iniciar sesión:

```bash
./infra/scripts/compose.sh exec api node dist/scripts/promote-super-admin.js --username '<usuario-real>'
```

No hay credenciales administrativas por defecto. Departamentos y categorías iniciales se crean desde el panel.

Entry point verifica montajes, permisos y entorno; usa `flock /data/.university.lock` para una API, backup consistente antes de migraciones pendientes y migraciones versionadas. No borrar lock para forzar un segundo proceso.

### Copias y recuperación

Leer `docs/backup-restore.md`. Se utiliza SQLite Online Backup API, no copia suelta del archivo principal mientras WAL está activo.

```bash
# Local: elegir una ruta privada nueva, no sobrescribir.
mise exec node@24.15.0 -- pnpm --filter api db:backup --output /ruta/privada/nueva-copia.sqlite
# Contenedor: usa directorio de copias configurado.
./infra/scripts/compose.sh exec -T api node dist/scripts/backup.js
```

Restauración offline con mismo bloqueo, respaldo previo, integridad/FKs, revocación de sesiones y auditoría. Seguir comandos exactos de la guía. No ejecutar `down -v`, borrar WAL/base o copiar datos de desarrollo a producción.

## 13. Verificación realizada y límites

Las evidencias técnicas del trabajo previo están en `docs/progress.md` y `docs/verification/`. **No se han vuelto a ejecutar todos esos flujos al redactar este relevo**.

- Typecheck de shared/API/web y build completos correctos en las verificaciones previas.
- Migraciones generadas con Drizzle, aplicadas y repetición idempotente; última 0007 con copia previa.
- Flujos manuales reales: login/sesiones/roles/CSRF, departamentos, tickets, privacidad de notas, asignación, estados, tableros/tareas y vínculos privados.
- Última ampliación Kanban comprobada el 4 de noviembre de 2026 en SQLite aislada: permisos USER/VIEW/EDIT/MANAGE, categoría duplicada 409, color inválido 422, sin CSRF 403, asociación de otro tablero 409 y PATCH de posición inválido 422.
- PATCH parcial conserva prioridad/categorías; borrar categoría conserva tarea. Movimientos con filtros y tareas ocultas verificados por HTTP tras arrastre real; recarga conserva estado.
- Chromium: vistas de escritorio/móvil, formularios conectados y scroll sin desbordamiento de documento; capturas en verificación. La revisión usó datos locales aislados, no semillas de la aplicación.
- Ensayo Docker/HTTPS real local: tres servicios, confianza explícita en CA sin bypass, cookies seguras, WSS, persistencia/recreación, backup/restauración y rechazos de configuraciones inseguras. Para negocio se usó override local de desarrollo, **no un AD simulado ni login institucional**.
- Contrato OpenAPI/colecciones comprobados localmente; governance de Postman requería login y no se ejecutó. `postman status` no existía en la CLI utilizada; no basarse en él.
- Sigue aviso no fatal de Vite por bundle >500 kB; no afirmar que está optimizado. Las imágenes deben reconstruirse al publicar cambios posteriores.

Pendiente externo real: habilitar/verificar LDAPS del DC, valores institucionales, CA/DNS/red, login institucional, bootstrap del ADMIN real y comprobación de acceso LAN/VPN. Health 200 solo demuestra salud del proceso/SQLite, no resuelve esos puntos.

## 14. Git e higiene

Estado revisado al preparar este documento: rama `master`, último commit `34da319` (`docs(api): version the current OpenAPI contract and Postman requests`), **61 commits**; `origin/master...HEAD` mostraba `0 0`. No había cambios antes de crear este Markdown. Es una foto local del seguimiento remoto, no un fetch nuevo ni garantía de que el remoto no cambie después.

Se organizó el trabajo existente en commits funcionales a petición del usuario, sin fechas inventadas. No interpretar esa división como sesiones históricas de implementación distintas.

`.gitignore` excluye dependencias, builds, cachés, logs, SQLite/WAL, copias, secretos/certificados privados, `.env` reales, basura de editor/SO y colecciones acumuladas antiguas de Postman fases 1–7. Conserva ejemplos de entorno, lockfile, migraciones/metadatos, recursos de marca, contratos actuales y capturas documentales deliberadas.

No añadir a Git contraseñas, cookies, tokens, bases de datos ni archivos generados indiscriminadamente. No hacer commit/push automático por crear este relevo.

## 15. Documentos que debe leer el siguiente chat

| Archivo | Para qué |
| --- | --- |
| `AGENTS.md` | Instrucciones locales y entrada a skills API. |
| `README.md` | Arranque, uso y resumen funcional. |
| `docs/progress.md` | Entregas y verificaciones por fase; límites externos. |
| `docs/deployment.md` | Despliegue, certificados, red, permisos, bootstrap y actualización. |
| `docs/active-directory.md` | Preparación e integración LDAPS. |
| `docs/backup-restore.md` | Copia consistente y restauración segura. |
| `docs/realtime.md` | Notificaciones WebSocket, autenticación y fallback. |
| `docs/design.md` | Oscuro permanente, sidebar y decisiones visuales. |
| `docs/brand.md` | Nombre, isotipo y archivos de marca. |
| `docs/kanban-views.md` | Vistas, filtros, categorías y contrato añadido. |
| `docs/verification/kanban-views.md` | Evidencia específica de la última ampliación. |
| `.env.example`, `infra/env/production.env.example` | Parámetros sin secretos. |
| `postman/specs/platform.openapi.json` | Contrato REST actual. |

## 16. Cómo continuar sin perder contexto

1. Leer este archivo, `AGENTS.md` y documentación de la funcionalidad solicitada.
2. Verificar `git status`, rama e historial actual; no asumir que siguen iguales.
3. Revisar código antes de modificarlo, usar Node 24 y lockfile existente.
4. No leer/imprimir secretos para reconstruir contexto; usar ejemplos. No sobrescribir `.env` existente.
5. Confirmar proceso/puerto antes de levantar o detener servidores. Para QA con escrituras, preferir SQLite y puertos aislados.
6. Cambios de persistencia: repositorio/servicio/contratos/permisos/frontend conectados, migración versionada y respaldo previo.
7. Comprobar tipado/build y flujo manual real; describir qué se ejecutó, qué no y qué depende del entorno institucional.
8. No añadir funcionalidades fuera de la siguiente petición. No asumir autorización para producción, Git push, cambios AD, firewall o datos del usuario.

### Texto breve para pegar en el siguiente chat

> Estamos continuando La Pizzara, en `/home/astro/Proyectos/university-platform`. Lee `CONTEXTO_RELEVO_LA_PIZZARA.md` y `AGENTS.md` antes de actuar. El MVP local está implementado; el despliegue está preparado, pero falta validar la infraestructura y login AD reales. Mantén Node 24, pnpm, NestJS/React/Drizzle/SQLite, oscuro permanente, permisos backend, notificaciones WebSocket y demo solo local. No inventes datos ni desactives TLS. Revisa el estado actual y limita los cambios a lo que te pida.
