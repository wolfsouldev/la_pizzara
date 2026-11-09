# Planificación de tableros y tareas

## Fechas y atrasos

Cada tarea puede tener fecha y hora límite, editables en su formulario. Tablero,
lista, detalle y calendario muestran el vencimiento. Una tarea está **vencida**
solo si la fecha pasó y está activa en una columna no completada. `isCompleted`
se calcula desde `column.isDone`: no existe un segundo estado independiente.
Archivar no equivale a completar; las archivadas no generan señal de atraso.

Filtros combinables: vencidas pendientes, vencen hoy, próximos siete días desde
ahora y sin fecha. El filtro de bloqueadas solo incluye pendientes. El reloj se
actualiza cada minuto y al volver a la pestaña, sin consultar repetidamente la API.
Fechas almacenadas como timestamp; presentación en hora local del navegador.
No se añaden recordatorios programados, correos ni trabajos en segundo plano.

## Subtareas y dependencias

En el detalle de una tarea puedes crear subtareas, cambiar su tarea principal,
abrir recursos relacionados y añadir/retirar predecesoras. Todo se persiste en
SQLite y queda en historial/auditoría. Las tres listas se paginan por separado.

- Una tarea puede tener una principal y varias subtareas, con varios niveles.
  Deben pertenecer al mismo tablero; se rechazan autorreferencias y ciclos.
- Las subtareas conservan su columna, responsables y fecha propios. Completar
  la principal no completa sus hijas, ni viceversa. El progreso incluye hijas
  directas archivadas, identificadas como tales en el detalle.
- Una dependencia «A bloquea B» relaciona tareas del mismo tablero. No admite
  duplicados, ciclos ni más de 100 predecesoras directas por tarea.
- **Los bloqueos son informativos**: no impiden mover/completar manualmente.
  Una predecesora deja de contar como bloqueo al entrar en una columna completada.
  Una predecesora archivada sin completar sigue bloqueando; desde la tarea activa
  se puede retirar esa dependencia. Archivar no resuelve trabajo pendiente.
- Nuevas relaciones requieren destino activo. Las relaciones antiguas se conservan
  para consulta, incluidas las archivadas. Una tarea archivada es de solo lectura.

VIEW puede consultar. EDIT puede crear y cambiar relaciones dentro del tablero
al que tiene acceso; MANAGE incluye esos permisos. USER nunca accede a estos
recursos. Conocer un UUID no concede acceso a otro tablero.

## Plantillas

**Plantillas**, en la cabecera del tablero, permite consultar estructuras
reutilizables. MANAGE crea/edita/elimina; EDIT puede usarlas al crear una tarea.
También se puede guardar una tarea existente como plantilla desde su detalle.

Cada plantilla contiene nombre, título, descripción, prioridad, checklist y un
plazo opcional en días (0–3650). Un día equivale a 24 horas desde la creación por
API. En el formulario se previsualiza la fecha y puede modificarse antes de
confirmar. No se copian responsables, categorías, relaciones, tickets,
conversaciones, historial ni el vencimiento absoluto de la tarea fuente.

Máximo 100 plantillas por tablero, nombres únicos normalizados sin distinguir
mayúsculas y 100 elementos de checklist por plantilla. El guardado desde una
tarea incluye todos sus elementos, no solo la primera página. Una tarea con más
de 100 elementos no se trunca: se rechaza su conversión. La copia siempre empieza
con checklist sin completar. Creación y copia son transaccionales.

Editar/eliminar una plantilla no modifica tareas creadas anteriormente. Omitir
un campo en PATCH conserva su valor. Al instanciar, omitir un campo usa el valor
de la plantilla; `dueAt: null` elimina expresamente el vencimiento.

La creación desde ticket sigue su flujo existente y admite tarea principal;
no aplica plantillas de forma implícita ni copia datos privados al portal.

## Calendario y carga de trabajo

Selector **Tablero / Lista / Calendario**. En escritorio aparece el mes con
semanas de lunes a domingo; cada día muestra hasta tres entregas y un botón para
abrirlas todas. En móvil cambia a agenda mensual, sin cuadrícula comprimida.
Cada tarea abre su detalle real. Navegación anterior/siguiente, mes actual y
selector mensual. Las tareas sin fecha aparecen en una sección aparte.

El resumen mensual incluye entregas, atrasos pendientes y completadas. «Reparto
de entregas por responsable» cuenta tareas del mes con los filtros actuales,
**no horas ni capacidad estimada**. Una tarea compartida cuenta una vez por cada
responsable; las no asignadas se agrupan aparte.

Vista, mes y filtros están en URL (`view=calendar`, `month=YYYY-MM`, `due`,
`blocked`), conservados al recargar. No son vistas compartidas independientes.
Se reutiliza la carga paginada autorizada del tablero, sin endpoint de calendario.

## Persistencia y contrato

Migración Drizzle `0010_light_brood.sql`: `task_parents`, `task_dependencies`,
`task_templates`. No recrea tablas existentes. Mantiene FKs, índices y controles
SQL de autorrelación, prioridad y plazo. Antes de migrar, hacer copia consistente.

Contrato OpenAPI v1.12.0; colección manual `postman/collections/Board planning`
con diez peticiones generadas del contrato y parametrizadas. Sesión/cookie real,
CSRF, origen e IDs/cuerpos explícitos; variables vacías no autorizan escrituras.
No contiene credenciales. Ejecución únicamente sobre entorno/datos autorizados.

| Método | Ruta bajo `/api/v1` | Permiso |
| --- | --- | --- |
| GET | `/tasks/:id/relations` | VIEW |
| PATCH | `/tasks/:id/parent` | EDIT |
| POST / DELETE | `/tasks/:id/dependencies` / `…/:blockingTaskId` | EDIT |
| GET | `/boards/:id/templates` | VIEW |
| POST / PATCH / DELETE | `/boards/:id/templates` / `…/:templateId` | MANAGE |
| POST | `/boards/:id/templates/:templateId/tasks` | EDIT |
| POST | `/tasks/:id/template` | MANAGE |

[Verificación y límites](verification/task-planning.md).
