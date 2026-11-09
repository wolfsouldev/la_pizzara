# Kanban: espacio de trabajo completo · 2026-11-08

## Alcance

Mejora visual del detalle de tableros, sin cambios en API, contratos, permisos,
esquemas, dependencias ni migraciones. Se mantienen el oscuro permanente, los
filtros en URL, el orden canónico y el rollback de movimientos.

- Solo `/staff/boards/:id` y `/admin/boards/:id` usan el ancho disponible y el alto
  de ventana; no heredan el máximo de 1440 px ni el pie global de otras páginas.
- Columnas adaptables desde 264 px; scroll horizontal local cuando no caben.
  Cada columna mantiene su cabecera y desplaza sus tareas verticalmente.
- Cabecera y tarjetas compactas, responsables con iniciales y nombre accesible,
  filtros desplegables con contador, búsqueda y archivo siempre disponibles.
- Lista con cabecera fija dentro del área desplazable. Se conservan selectores
  de estado y flechas de orden. Los controles móviles reducen espacio sin perder
  etiquetas accesibles. En ventanas bajas se puede desplazar el área de trabajo.

## Entorno y comprobaciones

Node 24.15.0 mediante mise; tipado y build completos del monorepositorio correctos.
También se compiló nuevamente web tras los ajustes finales. Continúan los avisos
no fatales de bundle >500 kB y anotaciones PURE de Zod; no se ocultaron.

Revisión asistida con Chromium sobre una copia consistente de la SQLite local,
creada con SQLite Online Backup API en un directorio privado de `/tmp`. Se usaron
el usuario local existente y la API real; sin mocks, semillas ni nuevas suites.
La base habitual no recibió las sesiones ni el movimiento de esta revisión.

- Tablero, Lista, apertura/cierre del detalle y formulario de nueva tarea sin
  guardar. Filtro de prioridad conservado al recargar y limpieza de filtros.
- Arrastre con puntero a otra columna: POST real respondió 200 y la tarea quedó
  en la columna destino después de recargar. Solo en la copia aislada.
- 1440×900: área de columnas 1136×556 px, cuatro columnas de 275 px con sidebar
  abierto. 1920×1080: área 1816×736 px con sidebar plegado (sin tope de 1440 px).
- 768×1024, 390×844, 375×812 y 844×390: ancho y alto del documento coinciden con
  la ventana. Las columnas se desplazan horizontalmente dentro del tablero.
- Móvil: abrir filtros y alcanzar el último selector; desplazamiento horizontal
  comprobado. Aumento del texto al 200% en escritorio sin desbordar el documento.
- Preferencia del sistema clara y movimiento reducido sin cambiar el oscuro.
  Regreso a la lista de tableros recupera `main.workspace-content` normal.
- Sin excepciones JavaScript en la pasada completa.

Los primeros intentos de revisión necesitaron corregir selectores del navegador
(etiquetas, rail/trigger y placeholder de arrastre) y esperar las navegaciones.
El primer gesto directo no confirmó movimiento; el gesto con activación previa
sí produjo el POST y la persistencia descritos arriba.

Capturas con los datos locales existentes, no contenido precargado del producto:

- [Tablero](kanban-workspace/board.png)
- [Lista](kanban-workspace/list.png)
- [Móvil](kanban-workspace/mobile.png)

No es una auditoría completa de accesibilidad, una prueba masiva de tareas ni
aceptación institucional. No se probó AD real, no se desplegó ni se reconstruyeron
imágenes Docker. Los procesos de revisión se detuvieron al terminar.
