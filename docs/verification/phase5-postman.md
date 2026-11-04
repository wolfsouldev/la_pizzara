# Postman local — fase 5

Objetivo real: API NestJS en loopback, puerto 3005, misma implementación y copia SQLite aislada. Cookie jar privado con una sesión ADMIN real; ningún token ni credencial se incluye en este documento. No publicación cloud, mocks ni scripts de tests.

## Primer intento: selección de items incorrecta

No se ejecutaron solicitudes. El generador agrupó `comments` en una carpeta adicional y el dashboard directamente en `admin`. Se corrigió la selección usando los nombres únicos de los items.

```text
No authorization data found. Please use the `postman login` command.
Refer:https://learning.postman.com/docs/postman-cli/postman-cli-options/#postman-login
Error: The following items were not found in the collection: staff/tickets/{id}/Consultar conversación y notas internas, admin/dashboard/Consultar estadísticas reales de tickets (admin)
```

## Segundo intento: resultado real

La CLI imprimió de nuevo el aviso de autorización cloud, pero ejecutó la colección local sin login. Salud, bandeja, opciones, detalle, comentarios, historial y dashboard administrativo devolvieron **200**. La salida literal de resumen fue:

```text
------------------------------------------------------------------
|                         |          executed |           failed |
--------------------------+-------------------+-------------------
|              iterations |                 1 |                0 |
--------------------------+-------------------+-------------------
|                requests |                 7 |                0 |
--------------------------+-------------------+-------------------
|            test-scripts |                 0 |                0 |
--------------------------+-------------------+-------------------
|      prerequest-scripts |                 0 |                0 |
--------------------------+-------------------+-------------------
|              assertions |                 0 |                0 |
------------------------------------------------------------------
| total run duration: 141 ms                                     |
------------------------------------------------------------------
| total data received: 10.41 KB (approx)                         |
------------------------------------------------------------------
| average response time: 6 ms [min: 3 ms, max: 9 ms, s.d.: 1 ms] |
------------------------------------------------------------------
```

Salida del proceso: 0. Esto acredita siete lecturas HTTP reales; no es una suite ni una comprobación exhaustiva de permisos. Escrituras, alcance por departamento, privacidad, rollback y el flujo completo se comprobaron separadamente contra API/SQLite y Chromium, según `../progress.md`.
