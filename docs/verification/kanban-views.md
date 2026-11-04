# Verificación de vistas y categorías · 2026-11-04

## Entorno

Node 24.15.0 mediante mise. Se creó una copia consistente antes de migrar mediante `db:backup`; las verificaciones de escritura usaron otra SQLite local aislada con API en loopback 3100 y Vite 5174. Usuarios locales de revisión reales mediante el servicio de aprovisionamiento, sesiones y permisos normales; sin mocks ni suites de tests. Las capturas muestran trabajo de revisión, no tareas precargadas en la aplicación.

La base habitual recibió únicamente la migración de esquema. Los conteos antes/después se conservaron: usuarios 3, departamentos 2, categorías de tickets 2, tickets 1, tableros 1, columnas 4, tareas 3. `integrity_check=ok`, `foreign_key_check` sin filas. La comparación completa contra el respaldo confirmó filas idénticas en departamentos, categorías de tickets, tickets, tableros, columnas, tareas, comentarios y checklist.

## Compilación y migración

- `pnpm typecheck`: shared, API y web correctos.
- `pnpm build`: shared, API y web correctos. Permanece el aviso de Vite por bundle mayor de 500 kB; no impide compilar.
- `db:generate`: migración 0007 generada con Drizzle Kit.
- `db:migrate`: aplicada en la base habitual y en la copia aislada; repetición sin errores.
- OpenAPI lint de sintaxis y colección adicional: sin errores. Governance requiere login, no se ejecutó.

## HTTP real en SQLite aislada

- Crear categoría 201, duplicado ignorando mayúsculas 409, color fuera del enum 422, escritura sin CSRF 403.
- Crear tarea con categoría y consultar la asociación persistida.
- PATCH solo de título conserva prioridad HIGH y categorías. PATCH `labelIds: []` retira asociaciones.
- Categoría de otro tablero rechazada 409; PATCH genérico de posición rechazado 422.
- Cambios de columna y reordenamiento confirmados mediante GET posterior.
- USER 403; técnico sin pertenencia 404; VIEW consulta pero no edita; EDIT asigna categorías pero no las administra; MANAGE puede renombrarlas.
- Eliminar categoría conserva tarea y retira sus asociaciones.
- Tablero archivado rechaza nuevas categorías 409.

La colección Postman se ejecutó solo para la lectura autorizada de categorías:

```text
GET http://127.0.0.1:3100/api/v1/boards/83bbd0d6-937f-45c7-8618-d0f52f1c6611/labels?page=1&limit=20 [200 OK, 1.27 KB, 19 ms]
iterations: 1 executed, 0 failed
requests: 1 executed, 0 failed
test-scripts: 0
prerequest-scripts: 0
assertions: 0
```

El primer intento no ejecutó solicitudes por selector de carpeta incorrecto; se corrigió usando el nombre de la petición. La advertencia de login de Postman no impidió esta lectura local. `postman status` no está disponible en la CLI instalada. No se publicaron recursos cloud ni se guardaron cookies/tokens en el repositorio.

## Navegador Chromium

- Tablero y lista renderizados con datos reales de la copia aislada, sin excepciones JavaScript.
- Crear categoría con React Hook Form y guardarla; seleccionarla desde el formulario de tarea y confirmar asociación mediante GET real.
- Búsqueda reduce resultados; limpiar filtros restaura la lista.
- Arrastre real con eventos de puntero: con una tarea oculta por prioridad, arrastrar dos visibles conserva el índice canónico de la oculta. Verificación posterior por HTTP.
- Arrastre entre columnas persistido y recarga manteniendo filtro y tareas visibles.
- Escritorio 1440 px sin desbordamiento de página; móvil 390 px con `scrollWidth=clientWidth=innerWidth=390`. La tabla y las columnas mantienen scroll interno horizontal.
- Se corrigió el contenedor de acciones de Heading para que sus botones envuelvan en pantallas estrechas.

Capturas:

- [Tablero](kanban-views/board.png)
- [Lista](kanban-views/list.png)
- [Categorías](kanban-views/categories.png)
- [Móvil](kanban-views/mobile.png)

No se verificó contra AD ni infraestructura de producción; este cambio no modifica su configuración.

Al terminar se cerraron el navegador, API y Vite aislados de revisión. El entorno habitual continúa en localhost:5173 y API 3000.
