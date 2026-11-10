# Tareas: vistas y categorías

## Uso

En **Tableros de trabajo**, abre un tablero:

- **Tablero**: columnas de estado con tarjetas arrastrables. Arrastrar sobre una tarjeta inserta antes de ella; soltar en el fondo de una columna añade al final.
- **Lista**: cambia el estado desde cada fila. Las flechas suben/bajan dentro de su estado usando **Orden del tablero**; se ocultan al ordenar por prioridad, fecha o título para evitar movimientos visualmente ambiguos.
- Busca por título/descripción y combina filtros de estado, prioridad, responsable y categoría. Se puede filtrar por tareas sin responsable/categoría.
- Vista, filtros y orden de lista quedan en la URL y se conservan al recargar o compartir el enlace. No se crean vistas compartidas nuevas ni preferencias globales.
- **Categorías** permite crear, renombrar, cambiar color y eliminar categorías propias del tablero. No son las categorías de solicitudes del Help Desk.
- Asigna varias categorías al crear una tarea o desde **Editar tarea y categorías** en su detalle. Las tarjetas y filas muestran la selección guardada.

Se conservan responsables, fechas, checklist, comentarios, vínculos privados, archivado e historial. El tema sigue siendo oscuro permanente.

## Permisos y persistencia

- USER nunca accede a tableros ni categorías internas. ADMIN y SUPER_ADMIN tienen acceso global MANAGE; ADMIN puede crear y administrar tableros.
- VIEW consulta; EDIT asigna categorías y modifica/mueve tareas; MANAGE administra categorías, columnas y miembros. TECHNICIAN necesita pertenencia elegible al tablero.
- Se pueden añadir como responsables técnicos activos del departamento, ADMIN y SUPER_ADMIN activos; deben ser miembros explícitos del tablero para recibir tareas. ADMIN/SUPER_ADMIN pueden incorporar cuentas ADMIN; un técnico con MANAGE no puede enumerarlas ni incorporarlas. Los usuarios USER nunca pueden añadirse a tableros internos.
- El backend comprueba acceso, pertenencia al tablero y estado archivado. No acepta categorías de otro tablero ni movimientos entre tableros.
- Nombres únicos por tablero sin distinguir mayúsculas; máximo 100 categorías por tablero y 20 por tarea. Colores limitados a seis valores validados.
- Eliminar una categoría retira sus asociaciones sin eliminar ninguna tarea. Requiere confirmación y se registra en auditoría.
- Migración `0007_ambitious_ted_forrester.sql`: `board_labels` y `task_labels`, con claves foráneas, índice único y eliminación en cascada solo de asociaciones.
- PATCH parcial no aplica los valores predeterminados de creación: omitir `labelIds` conserva categorías; enviar `[]` las retira. Omitir prioridad también la conserva.
- Los índices de arrastre se calculan con el orden completo autorizado, no con la lista filtrada. Las tareas ocultas por un filtro no se pierden ni cambian de estado.
- La mutación conserva rollback optimista y usa `orders` canónicos de la API. Las escrituras no exponen información en los endpoints públicos de tickets.

## API añadida

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/boards/:id/labels?page=1&limit=20` | VIEW |
| POST | `/api/v1/boards/:id/labels` | MANAGE |
| PATCH | `/api/v1/boards/:id/labels/:labelId` | MANAGE |
| DELETE | `/api/v1/boards/:id/labels/:labelId` | MANAGE |

POST/PATCH de categoría reciben `name` y `color` (`violet`, `blue`, `green`, `amber`, `rose`, `gray`). TaskCreate, TaskPatch y creación desde ticket aceptan `labelIds`. Las respuestas internas Task/TaskDetail incluyen `labels`.

Contrato: `postman/specs/platform.openapi.json` v1.8. Colección manual adicional: `postman/collections/Kanban categories` (cuatro peticiones, sin mocks, ejemplos inventados ni scripts de tests). Configurar IDs reales y CSRF de sesión solo al ejecutarla; no lanzar escrituras indiscriminadamente.

[Comprobaciones realizadas](verification/kanban-views.md).

## Espacio de trabajo del tablero

El detalle de cada tablero aprovecha todo el ancho disponible junto al sidebar
(plegable) y el alto de ventana, sin el límite de ancho de las páginas de
formularios. Las columnas se reparten el espacio y mantienen scroll horizontal
local si no caben; las tareas tienen scroll vertical dentro de cada columna.
La vista Lista conserva su cabecera al desplazar las filas.

La búsqueda y el archivo permanecen visibles. **Filtros** abre/cierra los
selectores y muestra cuántos están activos; cerrarlos no borra su selección ni
cambia la URL. **Limpiar** elimina los filtros y la búsqueda. En móvil se compactan
las acciones de configuración/categorías; sus iconos mantienen nombres accesibles.

[Evidencia de esta mejora visual](verification/kanban-workspace.md).

## Planificación

El tablero incorpora vencimientos y filtros de atraso, subtareas/dependencias,
plantillas de checklist y una tercera vista Calendario con reparto de entregas.
Consultar [comportamiento, permisos y contrato](task-planning.md).
