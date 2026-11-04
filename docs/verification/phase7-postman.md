# Postman local — fase 7

API real NestJS en loopback 3007, SQLite aislada y cookie ADMIN real en archivo privado. Sin mocks, scripts de tests, publicación cloud ni eventos de reporte. Dos ejecuciones separadas para la variable `id` de tarea/ticket; tres GET 200, código 0 en ambas. Cero scripts/assertions: las escrituras, límites y privacidad se comprobaron manualmente contra API/SQLite y Chromium (ver `../progress.md`).

Salida literal completa (UUID de QA, sin secretos):

## Tickets de una tarea

```text
No authorization data found. Please use the `postman login` command.
Refer:https://learning.postman.com/docs/postman-cli/postman-cli-options/#postman-login

Running your collection...
postman

University Phase 7

Folder tickets
Sub-folder Consultar tickets vinculados

  GET http://127.0.0.1:3007/api/v1/tasks/6be22191-cf92-42c4-84d9-a6b6a0339f82/tickets?page=1&limit=20 [200 OK, 1.51 KB, 22 ms]

---------------------------------------------------------------------
|                         |           executed |             failed |
--------------------------+--------------------+---------------------
|              iterations |                  1 |                  0 |
--------------------------+--------------------+---------------------
|                requests |                  1 |                  0 |
--------------------------+--------------------+---------------------
|            test-scripts |                  0 |                  0 |
--------------------------+--------------------+---------------------
|      prerequest-scripts |                  0 |                  0 |
--------------------------+--------------------+---------------------
|              assertions |                  0 |                  0 |
---------------------------------------------------------------------
| total run duration: 77 ms                                         |
---------------------------------------------------------------------
| total data received: 568 B (approx)                               |
---------------------------------------------------------------------
| average response time: 22 ms [min: 22 ms, max: 22 ms, s.d.: 0 us] |
---------------------------------------------------------------------
```

## Tareas de un ticket y salud

```text
No authorization data found. Please use the `postman login` command.
Refer:https://learning.postman.com/docs/postman-cli/postman-cli-options/#postman-login

Running your collection...
postman

University Phase 7

Folder tasks
Sub-folder Consultar tareas relacionadas autorizadas

  GET http://127.0.0.1:3007/api/v1/staff/tickets/b20b1366-9376-4626-982a-0a5013559d52/tasks?page=1&limit=20 [200 OK, 2.08 KB, 17 ms]

Root Comprobar API y consulta real a SQLite

  GET http://127.0.0.1:3007/api/v1/health [200 OK, 1022 B, 4 ms]

--------------------------------------------------------------------
|                         |           executed |            failed |
--------------------------+--------------------+--------------------
|              iterations |                  1 |                 0 |
--------------------------+--------------------+--------------------
|                requests |                  2 |                 0 |
--------------------------+--------------------+--------------------
|            test-scripts |                  0 |                 0 |
--------------------------+--------------------+--------------------
|      prerequest-scripts |                  0 |                 0 |
--------------------------+--------------------+--------------------
|              assertions |                  0 |                 0 |
--------------------------------------------------------------------
| total run duration: 91 ms                                        |
--------------------------------------------------------------------
| total data received: 1.17 KB (approx)                            |
--------------------------------------------------------------------
| average response time: 10 ms [min: 4 ms, max: 17 ms, s.d.: 6 ms] |
--------------------------------------------------------------------
```
