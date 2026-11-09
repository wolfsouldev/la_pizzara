# Verificación de planificación · 2026-11-08

## Entorno y seguridad de datos

Node 26.13.0 y pnpm 12.15.0, respetando la actualización local del proyecto.
SQLite real aislada en `/tmp/pizzara-planning-qa/review.sqlite`, API loopback 3111
y Vite 5178. Acceso de desarrollo explícito con cuentas locales ya registradas,
sesiones opacas, origen y CSRF normales. Las escrituras de negocio de esta revisión
se realizaron **solo sobre esa copia**. Sin mocks, semillas de aplicación,
suites automatizadas añadidas ni CI. Scripts manuales privados fuera del repo.

Online Backup previo privado e ignorado por Git, permisos 0600:
`apps/api/backups/pre-task-planning-20261108-180519.sqlite`.
Migración 0010 generada con Drizzle, aplicada primero en copia y repetida sin
cambios, después aplicada localmente. Solo añade tres tablas, sin reconstrucciones.

La comparación final de las **26 tablas preexistentes de negocio** contra el
respaldo no encontró diferencias. La base habitual tiene las nuevas tablas vacías:
no recibió las tareas, tableros ni plantillas de QA. Ambas SQLite:
`integrity_check=ok`, `foreign_key_check` sin filas, once migraciones registradas.
Health local 200 confirmó proceso/SQLite, no AD ni aceptación institucional.

## HTTP y persistencia real

Primer recorrido ADMIN: **67 respuestas HTTP comprobadas** y aserciones de sus
contenidos, incluyendo:

- Crear principal/hija/nieta; rechazos 409 de autorrelación, ciclos de dos/tres
  nodos y principal de otro tablero. PATCH sin CSRF 403. Separar/reasociar conserva
  la tarea. Progreso de hijas cambia al moverlas a columna completada.
- Dependencias persistentes, rechazo 409 de duplicados, autorrelación, ciclos
  indirectos y otro tablero. Completar la predecesora retira el contador; reabrirla
  lo restaura. Archivar sin completar no resuelve el bloqueo. Retirar una
  dependencia archivada desde la tarea activa funciona; no se admiten nuevas
  relaciones a archivadas ni mutaciones sobre la tarea archivada.
- Crear/editar/listar/eliminar plantillas; duplicado sin distinguir mayúsculas
  409; plazo negativo y 101 elementos 422. Plantilla de otro tablero 404.
- Instanciar conserva prioridad y plazo por defecto; `dueAt: null` y prioridad
  explícita prevalecen. Checklist copiado sin completar. Un responsable inválido
  devuelve 409 y no deja una tarea adicional. Eliminar/editar la plantilla no
  altera las tareas creadas antes.
- Plantilla de 100 elementos → tarea con 100 elementos → guardar tarea como
  plantilla → nueva tarea con los 100, todos sin completar, aunque la fuente
  tuviera elementos completados. No se trunca a la primera página.

Sesiones adicionales, con pertenencia explícita solo en la copia:

- USER: 403 en relaciones, tareas, plantillas y mutaciones.
- TECHNICIAN VIEW: consulta relaciones/plantillas; 403 en cambios de principal,
  dependencias, instanciación y creación de plantillas. Interfaz sin creación.
- EDIT: cambia principal e instancia con checklist; no administra plantillas.
- MANAGE: además crea plantillas. Al retirar pertenencia, consultas 404.
- Tablero archivado: creación de plantilla 409.

## Chromium real

- Formulario de plantilla: nombre, título, descripción, plazo y checklist; guardado
  y selección al crear una tarea, con previsualización de campos y copia real.
- Crear subtarea desde detalle y consultar su relación persistida.
- Calendario de 42 celdas, lista completa de un día con seis entregas mediante
  «más», detalle de tarea, reparto por responsable y sección sin fecha.
- Escritorio 1440×1050 y agenda móvil 390×844 / 375×812, sin desbordamiento
  horizontal del documento. Formularios Radix/shadcn, sin selectores nativos visibles.
- Se corrigieron el ancho mínimo del selector de archivo móvil y la independencia
  entre la búsqueda de predecesoras y las opciones de tarea principal.
- Navegación mensual y filtros conservados al recargar URL; completadas con fecha
  pasada excluidas del filtro de vencidas. Añadir/retirar dependencia y cambiar
  principal confirmados por interfaz y GET posterior, sin errores de JavaScript.
- Se conserva orden completo autorizado en movimientos; completado sigue derivado
  de columna, incluso durante su representación optimista.

Capturas de trabajo **de revisión aislada**, no datos precargados:

- [Calendario de escritorio](task-planning/calendar-desktop.png).
- [Agenda móvil](task-planning/calendar-mobile.png).
- [Relaciones en el detalle](task-planning/task-relations.png).

## Compilación, contrato y Postman

`pnpm typecheck` y `pnpm build` completos correctos. Permanecen avisos no fatales
por anotaciones PURE de Zod y bundle Vite >500 kB; no se declara optimizado.

Contrato v1.12.0, lint sintáctico: `No issues found.` Colección generada desde el
subcontrato, diez peticiones parametrizadas; lint: `Scanned: 10 | Errors: 0 |
Warnings: 0`. Se retiraron ejemplos generados y la cabecera de autenticación
inferida por el generador; usa cookie real, no un API key ficticio.

Dos ejecuciones locales guardadas, `--no-report-events`, con cookie de QA privada:

```text
Consultar subtareas y dependencias
  Pass  HTTP 200
  Pass  Respuesta con datos reales
  Pass  Relaciones paginadas
  requests: 1 executed / 0 failed
  assertions: 3 executed / 0 failed

Listar plantillas del tablero
  Pass  HTTP 200
  Pass  Respuesta con datos reales
  Pass  Plantillas paginadas
  requests: 1 executed / 0 failed
  assertions: 3 executed / 0 failed
```

La CLI avisó `No authorization data found. Please use the postman login command.`
pero ambas ejecuciones locales finalizaron correctamente sin login/publicación.
No se lanzó la colección completa con escrituras ni governance en la nube.

## Límites

Dependencias informativas, sin bloqueo automático de movimientos. Carga medida en
número de entregas, no horas ni capacidad. Sin recordatorios programados,
recurrencia o integraciones de calendario externas. Las fechas usan hora local
del navegador; las plantillas expresan días de 24 horas. No se verificó Docker,
LDAPS/login institucional, infraestructura, despliegue ni aceptación de producción.

Cierre: repetidos typecheck/build tras los últimos ajustes; correctos. Repetida
la interacción de relaciones también desde URL con filtro de archivo: mantiene
candidatas activas autorizadas. Cerrados únicamente API/Vite propios de QA y
retirados sus exports de cookies/sesión. No se detuvieron procesos del usuario.
