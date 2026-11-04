# Postman local — fase 6

API NestJS real en loopback, puerto 3006; copia SQLite aislada, sesión ADMIN real y cookie jar privado. Sin mocks, login cloud, publicación, eventos de reporte ni scripts de tests. Dos ejecuciones para no confundir la variable `id` de tablero y tarea. Ambas salieron con código 0. Los nueve GET devolvieron 200; esto acredita lecturas, no assertions ni autorización completa. Las escrituras, límites de acceso y rollback se verificaron aparte, según `../progress.md`.

La CLI imprimió el aviso de login cloud pero ejecutó los archivos locales. Se conserva a continuación el resultado literal completo; los UUID son exclusivamente del entorno aislado, sin credenciales ni cookies.

## Tableros y salud

```text
No authorization data found. Please use the `postman login` command.
Refer:https://learning.postman.com/docs/postman-cli/postman-cli-options/#postman-login

Running your collection...
postman

University Phase 6

Root Comprobar API y consulta real a SQLite

  GET http://127.0.0.1:3006/api/v1/health [200 OK, 1022 B, 12 ms]

Folder boards
Sub-folder Listar tableros autorizados

  GET http://127.0.0.1:3006/api/v1/boards?page=1&limit=20 [200 OK, 2.1 KB, 5 ms]

Folder {id}
Sub-folder Consultar tablero privado

  GET http://127.0.0.1:3006/api/v1/boards/dbe4dd87-d218-496d-aa90-c68519f143ae [200 OK, 2.15 KB, 5 ms]

Folder members
Sub-folder Consultar miembros del tablero

  GET http://127.0.0.1:3006/api/v1/boards/dbe4dd87-d218-496d-aa90-c68519f143ae/members?page=1&limit=20 [200 OK, 1.71 KB, 5 ms]

Folder tasks
Sub-folder Listar tareas del tablero

  GET http://127.0.0.1:3006/api/v1/boards/dbe4dd87-d218-496d-aa90-c68519f143ae/tasks?page=1&limit=20 [200 OK, 1.61 KB, 6 ms]

-------------------------------------------------------------------
|                         |          executed |            failed |
--------------------------+-------------------+--------------------
|              iterations |                 1 |                 0 |
--------------------------+-------------------+--------------------
|                requests |                 5 |                 0 |
--------------------------+-------------------+--------------------
|            test-scripts |                 0 |                 0 |
--------------------------+-------------------+--------------------
|      prerequest-scripts |                 0 |                 0 |
--------------------------+-------------------+--------------------
|              assertions |                 0 |                 0 |
-------------------------------------------------------------------
| total run duration: 128 ms                                      |
-------------------------------------------------------------------
| total data received: 3.81 KB (approx)                           |
-------------------------------------------------------------------
| average response time: 7 ms [min: 5 ms, max: 12 ms, s.d.: 3 ms] |
-------------------------------------------------------------------
```

## Detalle, comentarios, checklist e historial de tarea

```text
No authorization data found. Please use the `postman login` command.
Refer:https://learning.postman.com/docs/postman-cli/postman-cli-options/#postman-login

Running your collection...
postman

University Phase 6

Folder tasks/{id}
Sub-folder Consultar detalle de tarea

  GET http://127.0.0.1:3006/api/v1/tasks/3a0e062a-4edc-4e00-928d-f3e5bf63fd81 [200 OK, 1.74 KB, 14 ms]

Folder comments
Sub-folder Consultar comentarios internos

  GET http://127.0.0.1:3006/api/v1/tasks/3a0e062a-4edc-4e00-928d-f3e5bf63fd81/comments?page=1&limit=20 [200 OK, 1.29 KB, 6 ms]

Folder checklist
Sub-folder Consultar checklist

  GET http://127.0.0.1:3006/api/v1/tasks/3a0e062a-4edc-4e00-928d-f3e5bf63fd81/checklist?page=1&limit=20 [200 OK, 1.23 KB, 6 ms]

Folder tasks/{id}
Sub-folder Consultar historial privado de tarea

  GET http://127.0.0.1:3006/api/v1/tasks/3a0e062a-4edc-4e00-928d-f3e5bf63fd81/events?page=1&limit=20 [200 OK, 7.62 KB, 6 ms]

-------------------------------------------------------------------
|                         |          executed |            failed |
--------------------------+-------------------+--------------------
|              iterations |                 1 |                 0 |
--------------------------+-------------------+--------------------
|                requests |                 4 |                 0 |
--------------------------+-------------------+--------------------
|            test-scripts |                 0 |                 0 |
--------------------------+-------------------+--------------------
|      prerequest-scripts |                 0 |                 0 |
--------------------------+-------------------+--------------------
|              assertions |                 0 |                 0 |
-------------------------------------------------------------------
| total run duration: 109 ms                                      |
-------------------------------------------------------------------
| total data received: 8.07 KB (approx)                           |
-------------------------------------------------------------------
| average response time: 8 ms [min: 6 ms, max: 14 ms, s.d.: 3 ms] |
-------------------------------------------------------------------
```
