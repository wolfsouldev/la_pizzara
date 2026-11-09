# La Pizzara — identidad visual y modo oscuro permanente

## Dirección visual

Petición: tema oscuro siempre activo, rediseño general, navegación shadcn/ui,
formularios React Hook Form y Zustand cuando haya estado global de interfaz.
No hay selector claro/oscuro ni dependencia del tema del sistema operativo.

- Fondo grafito `#101114`, superficies `#17191d`, texto `#edf0f4`.
- Texto secundario `#a0a7b4`, azul de acciones/foco `#9db4ff`, límites `#30343d`.
- Verde, ámbar y rosa se reservan para estados, advertencias y errores; llevan texto,
  no sustituyen las etiquetas. Sin gráficos, porcentajes ni métricas inventadas.
- Tipografía del sistema, sin solicitudes a fuentes externas; cifras tabulares.
- Navegación lateral agrupada; contenido alineado a la izquierda; barra superior
  con ruta y notificaciones. Tablas densas pero legibles, formularios con espaciado
  mayor y Kanban horizontal dentro de su propio contenedor desplazable.
- El resumen usa los indicadores reales existentes. El login explica el recorrido
  de una solicitud, no simula un dashboard ni presenta actividad inexistente.

Se consultaron las skills Frontend Design, UI/UX Pro Max, Web Design Guidelines y
React Best Practices. La sugerencia genérica de UI/UX Pro Max incluía una landing
con glassmorphism: no corresponde a una herramienta de atención interna, así que
se descartaron sus efectos y su estructura de marketing. La dirección anterior
prioriza la legibilidad, el tema solicitado y los flujos reales de La Pizzara.

## Implementación

- `apps/web/index.html`: clase `dark`, `color-scheme` y color del navegador desde
  el HTML inicial, antes de cargar React (sin destello claro).
- `src/styles/globals.css`: tokens semánticos compartidos, controles nativos,
  autofill, foco, selección, scroll y movimiento reducido. Los portales Radix
  heredan el mismo tema. Sin estilos claros específicos por pantalla.
- Sidebar original de [shadcn/ui, variante Radix new-york-v4](https://ui.shadcn.com/r/styles/new-york-v4/sidebar.json),
  con Sheet, Tooltip, Separator, Input y Skeleton del mismo registro. Imports
  adaptados a los paquetes Radix individuales y a los alias del proyecto.
  Etiquetas traducidas, landmarks sin `main` anidados, atajo Cmd/Ctrl+B que no
  intercepta la edición de campos y cierre explícito del menú móvil.
- `stores/workspace-ui.ts`: Zustand persist guarda únicamente `sidebarOpen` en
  `campus-workspace-ui`. Sustituye la cookie de presentación del ejemplo de
  shadcn; no guarda sesión, roles, tokens ni datos privados. El estado temporal
  del Sheet permanece en el provider de shadcn.
- TanStack Query sigue siendo la fuente de sesión, permisos y datos remotos.
  No se traslada su caché a Zustand ni se cambian peticiones o contratos REST.
- Formularios conservan React Hook Form y Zod. Login, nueva solicitud,
  organización y tareas usan campos con IDs, etiquetas y errores asociados;
  el primer error recibe foco. Los filtros simples no requieren un formulario
  de envío. Los campos permanecen editables hasta iniciar la petición real.
- Navegación móvil desde 375px, sidebar plegable en escritorio con tooltips,
  enlace de salto al contenido, soporte de teclado y movimiento reducido.

## Verificación local

Compilación y tipado del monorepositorio comprobados. Revisión manual asistida
con Chromium/CDP; no se añadieron suites de tests, mocks o servicios.

Comprobado en la aplicación existente y con sesión local real:
- Oscuro con preferencia del sistema clara, y con movimiento reducido.
- Login local; dashboard y tablas con datos reales; detalle de ticket.
- Sidebar plegado y persistido tras recarga; menú Sheet móvil; navegación que
  cierra el menú y navegación por teclado/Escape en diálogo.
- Validación vacía de solicitud (categoría/título/descripción), departamento
  (nombre/slug) y tarea (título), sin guardar registros de negocio.
- Tablero real con cuatro columnas; formulario de tarea oscuro; dropdown de
  notificaciones. No se ejercitó un nuevo movimiento DnD ni el envío de avisos
  porque esta revisión no añade tareas ni modifica tickets.
- 375×812 y 768×1024 sin desbordamiento del documento; Kanban y tablas conservan
  desplazamiento horizontal local cuando el contenido lo necesita.
- Texto secundario sobre card: contraste 7.28:1; texto principal: 15.4:1;
  botón primario: 8.84:1; error: 8.95:1. No equivale a una auditoría WCAG completa.

Capturas en `docs/verification/redesign-*.png`. Los nombres y datos visibles
pertenecen al entorno local existente, no a una universidad en producción.

## Límites

No cambian autenticación, permisos, API, SQLite ni migraciones. El despliegue real
sigue necesitando AD, certificados y red institucionales. Las imágenes Docker
ya construidas no se han reconstruido ni desplegado en este cambio visual:
construir una nueva release según `deployment.md` para publicar estos cambios.
Permanece el aviso de Vite de bundle JavaScript superior a 500 kB; no se ha
ocultado ni se introdujeron cambios de arquitectura para este rediseño.

## Selectores y bandeja de tickets · 2026-11-08

- Select de shadcn/ui sobre Radix (`components/ui/select.tsx`), con tokens oscuros, indicador de selección, foco, opciones deshabilitadas, grupos y scroll. El popup se monta en portal por encima de los diálogos; respeta altura disponible y movimiento reducido.
- `SelectInput` comparte la composición para filtros y controles locales. `FormSelect` usa `useController` de React Hook Form para mantener validación, foco, `setValue`, `reset` y campos nullable. El valor vacío de filtros sigue siendo `''` y la desasignación sigue enviando `null`; el identificador visual interno nunca es un valor de negocio.
- Se sustituyeron los 39 selectores nativos de formularios, administración, tickets y Kanban. No se cambian checkboxes múltiples por un selector simple.
- Todos los tickets y Mis tickets comparten una bandeja más compacta: navegación entre alcances, búsqueda con pausa de 250 ms, estado/prioridad visibles, filtros de equipo/categoría/responsable desplegables, etiquetas extraíbles y limpieza global. Los filtros y totales siguen siendo del servidor, no de la página visible.
- Tabla con mejor jerarquía entre número/título, solicitante, equipo, estado, prioridad y responsable; scroll horizontal local en móvil. Los conteos proceden de la respuesta real, sin métricas decorativas.

Ver evidencia y límites en `verification/selects-ticket-inbox.md`.
