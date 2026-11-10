# Notificaciones y chat de tickets por WebSocket

Se conserva la API REST como fuente de datos y SQLite como almacenamiento durable. A petición explícita del usuario se adelanta WebSocket respecto al plan original. Una sola API NestJS y una conexión SQLite local; sin Redis, colas, JWT ni procesos de notificaciones externos.

## Transporte y uso

- Socket.IO 4.8.4, **solo WebSocket**, mismo servidor/puerto de la API, path `/api/v1/realtime` (no namespace).
- React conecta al mismo origen web, cookie de sesión HttpOnly automática y handshake `auth: { csrfToken }` obtenido de `/auth/me`. No leer cookies desde JS, poner tokens en URL/localStorage ni enviar `userId`.
- Servidor emite `notifications:changed` y `tickets:changed`, **sin payload**, a destinatarios autenticados y autorizados. React recupera los datos mediante HTTP; nunca se transportan cuerpos de mensajes, IDs de tickets ni notas por el socket.
- No hay eventos de aplicación cliente-servidor, suscripción a rooms ni selección de destinatario. Un mensaje arbitrario desconecta al cliente.
- Vite proxifica el path con `ws: true` antes de la regla HTTP `/api`. La publicación de fase 9 en `infra/Caddyfile` preserva upgrade y path `/api/*`; no publica un segundo puerto de sockets.
- Reconexión de transporte automática con espera 1–10 segundos. Cada conexión recupera HTTP; las listas abiertas, contador y dashboard reconcilian cada 30 segundos, incluso conectados. Una señal perdida no pierde la notificación y una retirada de permisos actualiza la vista sin esperar otro evento.
- Caídas de transporte no invalidan por sí mismas una sesión válida. Una desconexión explícita del servidor reintenta el handshake; si este rechaza la autenticación, vuelve a comprobar `/auth/me`. La página ofrece reintento y muestra errores/conexión caída; no aparenta una conexión en vivo inexistente.

## Chat de tickets · ampliación 2026-11-08

El chat de Mis solicitudes y del detalle interno reutiliza los comentarios persistentes existentes. **Se envía por POST HTTP con sesión, Origin y CSRF; se recibe en vivo mediante señal WebSocket y recuperación HTTP autorizada.** No se añade otro socket, servicio, tabla ni canal de escritura sin Guards. Ver `ticket-chat.md`.

- `TicketRealtimeService` recibe el ID del evento insertado por el servicio de negocio. Una microtarea comprueba que el evento sigue persistido después de finalizar la transacción SQLite síncrona; rollback no emite. Agrupa cambios del mismo ticket.
- Antes de cada señal, el gateway revalida la sesión y consulta el alcance actual del ticket: propietario para cambios públicos; ADMIN/SUPER_ADMIN con alcance global o TECHNICIAN con alcance departamental para cambios internos/públicos. No basta con haber abierto antes la conversación.
- Una nota interna no genera `tickets:changed` para un solicitante sin acceso de personal. Las consultas públicas continúan excluyendo las notas en SQL y usando el DTO público. El envío de una respuesta pública conserva la notificación persistente existente al solicitante.
- Conectar/reconectar invalida conversación, detalle e historial abiertos. Se reconcilian cada 30 segundos, incluso si se perdió una señal. El historial carga 20 mensajes por página, sin duplicados visuales; cargar anteriores conserva el punto de lectura.
- GET de detalle, comentarios y eventos de tickets ahora son lecturas pasivas: **no renuevan la inactividad**. Socket y polling no mantienen una pestaña olvidada autenticada. Los POST/PATCH y demás operaciones explícitas conservan su comportamiento.
- Tickets cerrados muestran historial, sin compositor; el backend sigue rechazando escrituras. No hay estados de lectura del destinatario, presencia, indicador de escritura ni mensajes diferidos en una cola local. El check junto a un mensaje propio significa guardado, no leído.

## Seguridad

- Origin exacto antes del handshake, no solo CORS: los navegadores no aplican la política CORS de HTTP a WebSocket. Handshake estricto solo admite CSRF válido; cookie única de sesión y comparación de hash CSRF en backend.
- Sesión activa del proveedor configurado, expiración absoluta/inactividad, usuario activo y revalidación LDAP pendiente se comprueban al conectar, antes de cada señal y cada 30 segundos. Directorio inaccesible con revisión caducada falla cerrado.
- No se transmite contenido privado por el socket. Los datos se obtienen exclusivamente por HTTP y se filtran en SQL por destinatario **y permisos actuales** de ticket/tablero. Cambiar a USER o retirar una pertenencia oculta también notificaciones históricas, su contador y marcado.
- En producción exige transporte seguro; `X-Forwarded-Proto` solo se acepta si Express confía en el proxy inmediato según su configuración restrictiva. No se relaja TLS/LDAPS.
- Máximo 500 conexiones de transporte, cinco sockets autenticados por usuario, handshake timeout de 10 segundos y máximo de mensaje 4096 bytes. Estos límites no sustituyen firewall/restricción LAN-VPN ni protección de proxy de fase 9.
- Sesiones revocadas no reciben la próxima señal; sin actividad adicional se desconectan como máximo en la próxima comprobación periódica. No hay invalidación instantánea interproceso porque solo se admite una instancia.
- Pings, handshake, comprobaciones periódicas, GET de sesión, notificaciones y dashboards **no renuevan la inactividad**. Evita que el polling de una pestaña olvidada conserve el acceso hasta el límite absoluto. Las operaciones de negocio explícitas mantienen el comportamiento de actividad de sesión.

## Persistencia y atomicidad

Las operaciones de tickets/tareas insertan avisos en sus transacciones existentes. `NotificationRealtimeService` agrupa inserciones por destinatario, espera una microtarea y confirma que al menos una fila insertada sigue persistida antes de emitir. Es válido para las transacciones **síncronas** actuales de better-sqlite3 y sus savepoints anidados. Un rollback no genera señal ni aviso durable. No debe trasladarse sin revisión a transacciones asíncronas u otro motor.

Marcar una notificación o todas las visibles como leídas sincroniza las otras pestañas. El timestamp individual es idempotente. No se purgan ni fabrican notificaciones para demostrar la UI.

## HTTP

| Método | Ruta relativa a `/api/v1` | Resultado |
|---|---|---|
| GET | `/notifications` | Lista paginada personal, page/limit 20/100 y unreadOnly true/false |
| GET | `/notifications/unread-count` | `{data:{count}}` con alcance actual |
| PATCH | `/notifications/:id/read` | DTO de notificación visible y marcada, 200; ajena/inaccesible 404 |
| POST | `/notifications/read-all` | `{data:{updated}}`, solo no leídas visibles |

Las mutaciones requieren Origin y X-CSRF-Token. DTO sin tokens/identidad del destinatario, con `href` autorizado: solicitud pública, ticket interno o tablero con `taskId`. No se incluyen notas internas en avisos públicos. No se envía al autor de su propia acción.

## Dashboard

Conserva métricas SQL por alcance de tickets. `myPendingTasks` cuenta tareas asignadas al usuario, no archivadas, tablero no archivado y accesible, columna `is_done=false`. ADMIN/SUPER_ADMIN ven tickets globales; TECHNICIAN ve solo su alcance departamental. Las tareas pendientes son siempre las asignadas al propio usuario, no las de todo el mundo. Cambios de columnas/movimientos y permisos se concilian mediante consultas cada 30 segundos; no todos los cambios del Kanban generan notificaciones.

## Límites verificados y pendientes

Es una notificación **dentro de la web**, no una notificación nativa del sistema ni push con navegador cerrado. Sin correo, service workers o WebSockets generales para sincronizar todo el tablero. Este transporte es best-effort, no una cola: SQLite/HTTP recuperan el estado.

La verificación local usa API/SPA reales y SQLite aislada. LDAPS institucional, TLS inverso y publicación LAN/VPN no se presentan como comprobados: la fase 9 los deja parametrizados y documentados, pendientes de activación administrativa externa.

Referencias oficiales: [Nest gateways](https://docs.nestjs.com/websockets/gateways), [Socket.IO middleware](https://socket.io/docs/v4/middlewares/), [Origin y WebSocket](https://socket.io/docs/v4/handling-cors/).
