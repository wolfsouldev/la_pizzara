# Fase 8 — Postman local real

CLI 1.76.0, colección v3 University Phase 8, API local 3008 con SQLite QA aislada y cookie jar privado de un técnico real. Solo tres lecturas; sin mocks, scripts ni assertions. La salida demuestra respuestas HTTP, no por sí sola la seguridad ni el flujo WebSocket; esas comprobaciones se detallan en progress.md. No se inició sesión cloud ni se publicó nada.

```text
No authorization data found. Please use the `postman login` command.
Refer:https://learning.postman.com/docs/postman-cli/postman-cli-options/#postman-login

Running your collection...
postman

University Phase 8

Folder notifications
Sub-folder Listar notificaciones propias

  GET http://127.0.0.1:3008/api/v1/notifications?page=1&limit=20&unreadOnly=false [200 OK, 1.69 KB, 19 ms]

Sub-folder Contar notificaciones no leídas

  GET http://127.0.0.1:3008/api/v1/notifications/unread-count [200 OK, 995 B, 7 ms]

Folder staff
Sub-folder Consultar estadísticas reales de tickets (staff)

  GET http://127.0.0.1:3008/api/v1/staff/dashboard [200 OK, 1.32 KB, 7 ms]

--------------------------------------------------------------------
|                         |           executed |            failed |
--------------------------+--------------------+--------------------
|              iterations |                  1 |                 0 |
--------------------------+--------------------+--------------------
|                requests |                  3 |                 0 |
--------------------------+--------------------+--------------------
|            test-scripts |                  0 |                 0 |
--------------------------+--------------------+--------------------
|      prerequest-scripts |                  0 |                 0 |
--------------------------+--------------------+--------------------
|              assertions |                  0 |                 0 |
--------------------------------------------------------------------
| total run duration: 123 ms                                       |
--------------------------------------------------------------------
| total data received: 1.12 KB (approx)                            |
--------------------------------------------------------------------
| average response time: 11 ms [min: 7 ms, max: 19 ms, s.d.: 5 ms] |
--------------------------------------------------------------------
```

Lint de sintaxis OpenAPI y colección ejecutados por separado. `postman status` no existe en esta versión de CLI; no es un fallo de la aplicación.
