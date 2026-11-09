# Contrato local · Fase 8

`specs/platform.openapi.json` describe las rutas implementadas. `collections/University Phase 8` contiene el contrato acumulado, con peticiones manuales y sin mocks ni scripts de pruebas. Los exports acumulativos de fases 1–7 se mantienen localmente como referencia, pero `.gitignore` los excluye para evitar subir varias copias redundantes.

```bash
postman spec lint postman/specs/platform.openapi.json --issueType=syntax
postman collection lint 'postman/collections/University Phase 8'
postman collection run 'postman/collections/University Phase 8' \
  -i 'Comprobar disponibilidad del servicio' \
  -i 'auth/Obtener CSRF de prelogin y disponibilidad de entrada local' \
  --no-report-events
```

Las peticiones de escritura son para uso manual, no ejecutar toda la colección de forma indiscriminada. Primero GET `/auth/csrf`; conserva su cookie mediante el cookie jar y usa su `csrfToken` como variable **temporal**, junto con `origin` exacto. Después de login, `/auth/me` devuelve el CSRF de sesión para logout. El cookie jar envía la cookie; no se sustituye por un header API key. En HTTPS de producción el nombre cambia a `__Host-uni.sid`.

`username` y `password` están vacíos: configurar valores privados solo durante el uso, nunca guardarlos en archivos versionados, parámetros de shell o reportes. El botón del frontend permite validar localmente el mismo flujo sin manipular secretos manualmente.

No hay ejemplos generados con identidades ficticias, assertions, automatización ni publicación cloud. Governance lint requiere cuenta Postman; el lint de sintaxis y ejecución local no requieren iniciar sesión. La versión instalada (1.76) no implementa `postman status`.

La colección de fase 8 incluye administración, catálogos, portal, atención interna y Kanban privado. Las variables de IDs y datos de escritura están vacías a propósito: usa IDs reales obtenidos de listados. No ejecutar toda la colección sin revisar operaciones y CSRF. Las lecturas administrativas se pueden ejecutar con `--cookie-jar` y un archivo privado serializado de tough-cookie; nunca versionarlo ni imprimir su contenido. Las mutaciones administrativas también requieren Origin y CSRF válidos.

Las rutas `/tickets` siempre tienen alcance de solicitante, incluso para administradores. El detalle acepta `historyPage`/`historyLimit`; la conversación `page`/`limit`. Para verificar el cierre/reapertura se necesita un ticket propio ya RESOLVED; el personal responsable o ADMIN puede resolver mediante PATCH `/staff/tickets/:id/status`; no hay endpoints de depuración. El contrato no expone notas internas ni metadatos brutos.


Atención: GET `/staff/tickets` aplica alcance de departamentos en SQL para TECHNICIAN. `/staff/tickets/options` alimenta filtros/asignación sin exponer usuarios de otros departamentos. GET de detalle, comentarios y eventos exige el mismo alcance. Solo responsable o ADMIN modifica; únicamente ADMIN asigna o traslada. CLOSED rechaza toda escritura. El cambio de departamento exige `departmentId` y `categoryId` activos y compatibles; `assignedToId` opcional se interpreta como null si se omite.

Las variables `status`, `priority` y `visibility` están vacías: seleccionar enums válidos al ejecutar escrituras manuales. El cuerpo de asignación se distribuye como null intencional para desasignar; sustituir por un UUID real para asignar. No ejecutar toda la colección sin revisar las mutaciones. No contiene scripts ni suites de tests.


Kanban: `/boards` y `/tasks/:id` requieren personal autorizado. Crear tablero es exclusivo ADMIN. VIEW lee; EDIT trabaja con tareas; MANAGE configura columnas/miembros. El departamento del tablero no cambia. Un técnico debe pertenecer tanto al departamento como al tablero; no basta un UUID ni la pertenencia al departamento. GET `/boards/:id/candidates` permite buscar miembros elegibles sin dar acceso administrativo de usuarios a técnicos.

Los responsables de tareas deben ser miembros explícitos activos/elegibles, incluso ADMIN. Mover usa `targetColumnId` y `targetIndex` (base cero, calculado excluyendo la propia tarea). No enviar `boardId`, `columnId`, `position` ni `status` por PATCH genérico de tarea. La respuesta de movimiento contiene `orders` canónicos. Reordenar columnas exige exactamente todos sus IDs en `columnIds`.

Las listas usan page/limit 20/100; `archived=true` lista tareas archivadas y `isArchived=true` tableros archivados. Archivos de solo lectura excepto retirada de miembros de tablero para revocar acceso. Retirar miembro desasigna tareas activas. Columnas ocupadas, incluso solo por tareas archivadas, no se eliminan. `GET /tasks/:id/events` expone historial privado paginado.

Las variables `boardId`, `columnId`, `itemId`, `permission`, `targetColumnId` y `dueAt` se completan con valores reales. `id` cambia según la ruta (tablero o tarea): separa ejecuciones de lecturas para evitar confundir recursos. `assigneeIds` y `columnIds` se distribuyen vacíos, no son registros precargados. La fase 7 añadió vínculos tarea-ticket; la fase 8 añade notificaciones personales. Colección actual: 82 peticiones, cero scripts de tests.


Fase 8: GET/POST `/staff/tickets/:id/tasks` (crear atómicamente tarea y vínculo, con `boardId` obligatorio); GET/POST `/tasks/:id/tickets`; DELETE `/tasks/:id/tickets/:ticketId`. La variable `id` representa ticket en la primera ruta y tarea en la segunda: separa sus ejecuciones. La variable `ticketId` usa un UUID real, no el número UNI.

Leer exige acceso a ticket y tablero, con totales SQL acotados a ese alcance. Escribir requiere EDIT/MANAGE y responsable del ticket o ADMIN, mismo departamento y ticket no CLOSED. Alta sobre tarea/tablero archivado devuelve 409; retirada de vínculo permitida como revocación privada. Duplicado 409, vínculo ausente 404. El traslado de un ticket con vínculos a otro departamento devuelve 409 hasta retirarlos. No hay ningún campo ni evento de tarea añadido al contrato público `/tickets`.


Fase 8: GET `/notifications?page=1&limit=20&unreadOnly=false`, GET `/notifications/unread-count`, PATCH `/notifications/:id/read` (id de **notificación**, no de ticket) y POST `/notifications/read-all`, sin cuerpos. Todas requieren sesión; mutaciones exigen Origin/CSRF. El destinatario sale de la sesión. Marcado individual idempotente, ajeno/inaccesible 404; conteos/listados excluyen avisos internos sin permisos actuales.

OpenAPI 1.7 incluye `myPendingTasks` en dashboard y `x-realtime` para el protocolo Socket.IO WebSocket-only `/api/v1/realtime`. El socket usa cookie HttpOnly, Origin estricto y `auth.csrfToken`, nunca JWT/userId. Evento sin payload `notifications:changed`: volver a consultar HTTP. No es un endpoint HTTP de negocio para ejecutar como GET desde la colección. Detalles: [realtime](../docs/realtime.md). Evidencia de lecturas reales: [phase8-postman](../docs/verification/phase8-postman.md).


Despliegue fase 9: no se añaden endpoints REST ni colecciones duplicadas; el contrato OpenAPI 1.7/82 peticiones permanece válido. Caddy conserva `/api/v1` y upgrade `/api/v1/realtime`, no elimina `/api`. Configurar `baseUrl` con el origen HTTPS **real** + `/api/v1`, Origin exacto y confiar en CA web en el cliente. No usar la cookie de desarrollo en producción ni desactivar TLS. LDAPS/backup/restauración/administrador se gestionan por CLI, no HTTP. Ver [despliegue](../docs/deployment.md).

### Mejora Kanban · OpenAPI 1.8

`collections/Kanban categories` añade cuatro peticiones manuales de categorías por tablero. No contiene mocks, ejemplos generados, scripts ni assertions. Usa cookies reales con `--cookie-jar`; `id` es tablero, `labelId` categoría interna, `labelName` su nombre y `color` uno de los seis valores documentados. Valores vacíos intencionalmente; las escrituras requieren `origin` y `csrfToken` de sesión. No confundir con `categoryId` de tickets.

TaskCreate/TaskPatch/TaskFromTicketCreate ahora admiten `labelIds`, y Task devuelve `labels`. Omitir `labelIds` en PATCH conserva la selección. Evidencia de una lectura autorizada y límites de verificación: [kanban-views](../docs/verification/kanban-views.md).
