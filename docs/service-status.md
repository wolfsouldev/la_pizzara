# Estado de los servicios universitarios

Catálogo autenticado de La Pizzara. **Información manual de administración**, no
sondeos HTTP/ICMP, uptime medido ni detección automática de caídas. No depende de
un servicio externo, colas o un proceso adicional. La interfaz distingue estado,
fecha del estado y notas, sin presentar disponibilidad inventada.

## Uso

- Sidebar **Estado de servicios**: `/app/services`, `/staff/services` y
  `/admin/services`. Todas las personas autenticadas consultan; ADMIN y
  SUPER_ADMIN administran el catálogo y las notas internas.
- Tarjetas adaptables con búsqueda por nombre, filtro de estado, descripción,
  última nota pública y fecha del estado. Ficha con descripción completa e
  historial paginado. Filtros/página/ficha en URL (`?service=<uuid>`).
- ADMIN y SUPER_ADMIN: **Nuevo servicio**, editar nombre/descripción/estado,
  archivar/restaurar y añadir/eliminar notas públicas o internas.
- Estados: Operativo, Con incidencias, No disponible, En mantenimiento y
  **Sin confirmar**. Este último es el predeterminado: crear un registro no
  acredita que el servicio esté funcionando.
- Nombre único normalizado NFKC/minúsculas; máximo 100 caracteres. Descripción
  hasta 3000; notas hasta 5000. Texto plano, no HTML ejecutable.
- No hay servicios precargados. Los nombres facilitados por el usuario son
  referencias; cada servicio y su estado real se registran desde administración.

La separación entre estado y comunicaciones toma como referencia el patrón de
[componentes de Statuspage](https://support.atlassian.com/statuspage/docs/show-service-status-with-components/),
sin integrar ese producto ni copiar métricas de disponibilidad.

## Privacidad y permisos

Notas `PUBLIC`: toda la comunidad **autenticada**. Notas `INTERNAL`: ADMIN y
SUPER_ADMIN; nunca son visibles para USER ni TECHNICIAN. El formulario de notas inicia en interna para evitar
publicar contenido por accidente. Publicar exige seleccionar explícitamente la
visibilidad pública.

El DTO de catálogo es una proyección explícita. La vista previa SQL solo busca
notas PUBLIC; no hay campos de notas internas, autores o claves de normalización
en sus respuestas. El historial público también filtra PUBLIC en SQL. No se
copian contenidos de notas a metadatos de auditoría.

Todas las mutaciones exigen sesión, origen y CSRF, con roles verificados en
backend. Se auditan altas, modificaciones, notas y vínculos dentro de la misma
transacción. No se expone una lista de tickets ajenos desde el catálogo.

## Vínculo con tickets

Un ticket puede tener un servicio opcional (`serviceId`, nullable), independiente
de categoría/departamento. Puede elegirse al crear la solicitud o desde su detalle
**Servicio relacionado**. Desde la ficha del servicio, **Crear solicitud** abre el
formulario con ese servicio preseleccionado; la API vuelve a comprobarlo.

- Portal propio: únicamente el solicitante, incluso si tiene rol ADMIN.
- Atención: ADMIN/SUPER_ADMIN globales o técnico de su departamento. Modificar
  exige que el ticket esté asignado al ADMIN/técnico, o actuar como
  SUPER_ADMIN. ADMIN/SUPER_ADMIN pueden asignar tickets a responsables
  elegibles. La relación no otorga acceso a un ticket.
- Cerrado: vínculo de solo lectura (409 al intentar modificarlo).
- Archivar un servicio lo retira del catálogo y bloquea nuevos vínculos (409),
  pero conserva relaciones existentes. Sus tickets muestran nombre/estado/fecha
  y aviso de archivo. Puede desvincularse de un ticket abierto o restaurarse.
- Cambiar el vínculo actualiza el ticket y registra `TICKET_SERVICE_CHANGED` en
  auditoría; no se reutilizan tipos de eventos del chat con otro significado.
- Las notas del servicio son comunicaciones generales, no comentarios del ticket.
  El chat e historial de cada solicitud continúan separados y privados.

## API y persistencia

Contrato REST v1.11 en `postman/specs/platform.openapi.json`:

| Ruta bajo `/api/v1` | Acceso |
| --- | --- |
| GET `/services`, `/services/:id`, `/services/:id/notes` | Autenticado; activos y notas públicas |
| GET/POST `/admin/services` | ADMIN o SUPER_ADMIN |
| GET/PATCH `/admin/services/:id` | ADMIN o SUPER_ADMIN; archivo/restauración por `isActive` |
| GET `/admin/services/:id/notes` | ADMIN o SUPER_ADMIN; incluye notas internas |
| POST `/admin/services/:id/notes` | ADMIN o SUPER_ADMIN |
| DELETE `/admin/services/:id/notes/:noteId` | ADMIN o SUPER_ADMIN; comprueba el servicio de la nota |
| GET/PATCH `/tickets/:id/service` | Solo propietario |
| GET/PATCH `/staff/tickets/:id/service` | Alcance y edición de atención |

PATCH de vínculo: `{ "serviceId": "<uuid-real>" }` o `{ "serviceId": null }`.
PATCH de servicio es parcial: omitir conserva; `{}` se rechaza. Cambiar descripción
no altera estado ni fecha del estado. Listas paginadas (20 por defecto, máximo
100); la interfaz usa 12 tarjetas y 20 notas/opciones por página. El selector de
servicio busca y pagina, no recorta el catálogo silenciosamente a 100 entradas.
ADMIN y SUPER_ADMIN filtran publicación `active|archived|all` (active por defecto).

Migración Drizzle `0008_ancient_ricochet.sql`: `university_services`,
`service_notes` y columna/índice/FK nullable `tickets.service_id`. Los tickets
anteriores quedan sin servicio; no se recrean datos ni se insertan ejemplos.
Antes de aplicarla en otro entorno: copia consistente y procedimiento de
[despliegue](deployment.md)/[backup](backup-restore.md). No usar `drizzle-kit push`.

HTTP autenticado se reconcilia al enfocar y cada 30 segundos (sin continuar en
segundo plano con la pestaña oculta). Estas lecturas, incluidas las del vínculo,
no renuevan la inactividad de sesión. No se añade otro WebSocket ni se presenta
el estado manual como telemetría en tiempo real. El chat mantiene su Socket.IO.

## Colección manual

`postman/collections/University services`: 14 peticiones generadas del subconjunto
del contrato y parametrizadas. Configurar cookie de una sesión real, origen,
CSRF e IDs reales; nunca usar una API key `uni.sid` en cabecera. La CLI generaba
esa autenticación incorrectamente y se adaptó a cookie jar/noauth.

Variables de escritura vacías deliberadamente (`serviceName`,
`serviceDescription`, `noteBody`, `id`, `noteId`, `ticketId`); no ejecutar toda la
colección sin preparar datos/autorización. `servicePatch` debe contener cambios
reales; `serviceIdOrNull` lleva el UUID entre comillas JSON o `null`.
No hay login Postman, publicación cloud, suites nuevas ni CI/CD.


## Catálogo compacto y dirección de acceso · 2026-11-08

La cabecera se centra y se elimina el bloque introductorio grande. Búsqueda,
estado, publicación administrativa y acciones se agrupan en una barra compacta.
Tres columnas en escritorio amplio; una en móvil, con nombre y estado de la
primera tarjeta visibles sin desplazarse en los tamaños revisados. Los estados
usan texto, icono y color; no hay pulso de telemetría ni resumen global inventado.

ADMIN y SUPER_ADMIN pueden guardar una **Dirección de acceso** opcional al crear/editar un
servicio. Las tarjetas con URL muestran **Acceder** y la ficha permite leer la
dirección completa. Abren en otra pestaña con `noopener noreferrer` y sin referer.
Sin URL no se muestra un botón vacío. Un enlace no acredita disponibilidad.

Solo URLs absolutas HTTP/HTTPS, máximo 2048 caracteres, sin credenciales,
espacios sin codificar o barras inversas. La URL es información pública del
servicio: no introducir secretos ni tokens de acceso en ella. No se consulta,
resuelve ni sondea desde el servidor. La validación no demuestra que el destino
exista o sea confiable; debe introducirse la dirección institucional real.

`ServiceCreate.url` es opcional y nullable; `ServicePatch.url` omitido conserva
el enlace y `null` lo elimina. La interfaz convierte el campo vacío en `null` y
PATCH solo envía campos modificados. Los DTO siempre devuelven `url: string|null`.
Migración `0009_modern_wonder_man.sql`: columna nullable `university_services.url`,
sin reconstrucción de tablas ni precarga de direcciones.

La colección manual incorpora `serviceUrlOrNull`: `null` o URL real entre
comillas JSON. Ver [revisión visual y de URL](verification/service-status-ui.md).
