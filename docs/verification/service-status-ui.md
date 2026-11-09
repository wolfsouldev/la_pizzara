# Catálogo compacto y URL de acceso · 2026-11-08

## Cambios

- Eliminado el panel introductorio que desplazaba las tarjetas hacia abajo.
- Título/información centrados, barra compacta con búsqueda y Select shadcn de
  estado/publicación; acciones administrativas conservadas.
- Tres columnas desde escritorio amplio; tarjetas con nombre, estado destacado,
  icono y color semánticos. Descripción/notas compactas; sin grandes cajas vacías.
- URL de acceso opcional editable por ADMIN; botón Acceder y dirección completa
  en ficha. Pestaña nueva sin opener/referer. No se sondea la dirección.

## Entorno y verificación

API propia 3111 + Vite 5178 sobre copia privada Online Backup de la SQLite de
revisión anterior; sesiones locales reales USER/ADMIN. No mocks, credenciales
institucionales ni escrituras de negocio en la base habitual. Los registros de
revisión adicionales permanecieron solo en `/tmp/pizzara-services-ui-qa`.

### Navegador real

Chromium, escritorio 1440×900 y móvil 375×812:

- Antes de añadir URLs, primera tarjeta en **y=344 escritorio**, **y=415 móvil**,
  con el estado móvil en **y=505**: nombre y estado visibles sin scroll inicial.
  Tres tarjetas en la primera fila de escritorio. No se promete que todo el
  catálogo quepa sin scroll ni el mismo resultado en cualquier viewport.
- ADMIN móvil, tras añadir URL: estado de primera tarjeta en **y=557**, también
  visible antes de desplazarse. Sin desbordamiento horizontal de documento.
- Filtro shadcn de estado real, URL/recarga, búsqueda combinada, estado vacío,
  nota pública, ficha, selección por teclado y Escape correctos.
- Formulario URL rechaza `javascript:` mostrando error asociado al campo.
- ADMIN edita solo URL: petición PATCH inspeccionada con únicamente `url`.
- USER abre Acceder en una pestaña real al frontend local de revisión;
  `target=_blank`, `noopener noreferrer`, `referrerPolicy=no-referrer` y
  `document.referrer` vacío comprobados. No se abrió ningún dominio institucional.
- Ficha muestra la URL completa y accesible en móvil; alta/cancelación del
  administrador conservadas. Sin errores JavaScript en las ejecuciones revisadas.

### API/persistencia real

- HTTP/HTTPS aceptados en alta; PATCH omitido conserva URL, null la elimina y
  restauración devuelve el enlace. Recarga/GET confirman persistencia SQLite.
- Diez entradas inválidas: javascript, data, protocolo relativo, FTP,
  credenciales embebidas, espacio en host, barra inversa, host ausente, salto
  de línea y longitud superior a 2048: **422**.
- Mutación sin CSRF: **403**. USER intenta editar URL: **403**.
- El servidor no realiza solicitudes a la URL introducida. HTTPS se validó como
  dato; no se simuló TLS ni se desactivó la verificación para conectar con él.
- Migración Drizzle `0009_modern_wonder_man.sql` revisada (solo columna nullable),
  aplicada dos veces en la copia aislada antes de aplicarse a la base habitual.
  Copia local previa privada e ignorada:
  `apps/api/backups/pre-service-urls-20261108-173531.sqlite` (0600).
- Integridad `ok`, FKs sin errores en ambas SQLite. Registros anteriores con URL
  nula; no se asignaron URLs ficticias a los servicios habituales.

### Compilación y contrato

Build API y web correctos, typecheck completo correcto, `git diff --check` sin
problemas. Persisten advertencias no fatales PURE de Zod/bundle Vite >500 kB.
OpenAPI 1.11 y colección manual actualizados. Lint de contrato sin violaciones;
colección con 14 peticiones, cero errores/avisos. Ejecución **solo lectura** de
la carpeta pública `services` con cookie USER e ID reales, sin publicación cloud:

```text
No authorization data found. Please use the `postman login` command.
Refer:https://learning.postman.com/docs/postman-cli/postman-cli-options/#postman-login

Running your collection...
postman

University services

Folder services
Sub-folder Listar servicios publicados

  GET http://localhost:3111/api/v1/services?page=1&limit=20 [200 OK, 3.27 KB, 15 ms]
  Pass  HTTP 200
  Pass  Respuesta con data

Folder {id}
Sub-folder Consultar servicio

  GET http://localhost:3111/api/v1/services/4b5173f4-7b3b-4c96-9233-563d019023ec [200 OK, 1.24 KB, 8 ms]
  Pass  HTTP 200
  Pass  Respuesta con data
  Pass  URL HTTP/HTTPS o null

Sub-folder Historial de notas del servicio

  GET http://localhost:3111/api/v1/services/4b5173f4-7b3b-4c96-9233-563d019023ec/notes?page=1&limit=20 [200 OK, 965 B, 3 ms]
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
|              assertions |                 8 |                 0 |
-------------------------------------------------------------------
| total run duration: 303 ms                                      |
-------------------------------------------------------------------
| total data received: 2.81 KB (approx)                           |
-------------------------------------------------------------------
| average response time: 9 ms [min: 3 ms, max: 15 ms, s.d.: 5 ms] |
-------------------------------------------------------------------
```

Capturas: [catálogo escritorio](service-status-ui/catalog-desktop.png),
[catálogo móvil](service-status-ui/catalog-mobile.png),
[URL en tarjeta](service-status-ui/urls-desktop.png),
[ficha móvil con URL](service-status-ui/url-detail-mobile.png).

Sin nuevos servicios/URLs de revisión en la base habitual. Sin cambios AD,
firewall, dominios, despliegue o commits/push. No se incorporaron suites de tests.
