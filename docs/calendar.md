# Videoconferencias

En **Videoconferencias** del menú lateral, la comunidad autenticada consulta
eventos publicados y puede solicitar un horario. Las vistas **Mes**, **Semana**
y **Agenda** son el mismo calendario, no tres listas independientes. La semana
muestra las horas; en pantallas pequeñas se abre la agenda por defecto. Las
fechas se muestran en la hora institucional (`America/Havana`).

## Comunidad

1. Pulsa **Solicitar videoconferencia** o elige un día del calendario.
2. Indica título, propósito, inicio, fin o duración y cantidad de participantes.
   Las observaciones son opcionales. Una solicitud debe empezar en el futuro y
   durar de 15 minutos a 7 días.
3. Sigue su estado en **Mis reservas**. Puedes retirar una pendiente. No ocupa
   horario ni aparece en el calendario público mientras esté pendiente.
4. Recibirás un aviso dentro de La Pizzara cuando se apruebe, rechace o cancele la
   reserva. El motivo de rechazo solo aparece en tu reserva y en administración.

## Administración

- ADMIN y SUPER_ADMIN consultan eventos públicos y privados. **Nuevo evento**
  crea un evento directamente; es privado por defecto. Su ficha permite editarlo,
  cambiar su visibilidad o cancelarlo.
- **Solicitudes de reserva** muestra el contador de pendientes, filtros y el salto
  a la semana solicitada. Aprobar requiere confirmar el título público. Las notas,
  el propósito, las observaciones y la identidad del solicitante no se copian al
  evento público. El administrador puede redactar una descripción pública aparte.
- Aprobar crea exactamente un evento público y registra la decisión en la misma
  transacción. Un rechazo exige un motivo y no crea un evento.
- En la única agenda no pueden coexistir dos eventos activos en el mismo horario,
  aunque uno sea privado. Los horarios contiguos sí se permiten. Al cancelar un
  evento se libera su horario y se conserva el historial. Una reserva aprobada
  sigue siendo pública mientras su evento esté activo.
- «Público» significa visible para cuentas autenticadas de La Pizzara, no para
  Internet. No se generan enlaces de Meet, Zoom ni Teams; no hay recurrencia,
  sincronización externa ni varias salas.

## Datos y despliegue

Los tiempos se guardan como milisegundos UTC. En el formulario, una hora local
ambigua o inexistente se rechaza en vez de cambiarse silenciosamente. La API
limita las consultas a un máximo de 45 días; devuelve solo eventos que intersectan
el rango solicitado. Los permisos, el origen y CSRF se verifican en el servidor.
La consulta pública selecciona únicamente los campos públicos en SQLite.

La migración versionada `0012_calendar_reservations.sql` añade las tablas de
eventos y solicitudes; no requiere variables de entorno nuevas. En local aplica
la migración habitual; Docker la aplica siguiendo el procedimiento de arranque
y respaldo existente. Contrato: `postman/specs/platform.openapi.json`.

## Verificación local

- La migración se aplicó dos veces en una base aislada, con comprobaciones de
  integridad y claves foráneas.
- HTTP real con sesiones locales de USER, ADMIN y SUPER_ADMIN: acceso anónimo y
  administrativo denegado cuando corresponde, CSRF, fechas inválidas, separación
  de datos, asignación de horario, edición, retiro, rechazo, cancelación y avisos.
  Dos aprobaciones en conflicto enviadas en paralelo devolvieron 201 y 409.
- En Chromium se creó una reserva como usuario, se aprobó como ADMIN y una
  tercera cuenta la vio publicada en la agenda móvil de 390 px, sin desborde
  horizontal del documento ni excepciones JavaScript. Las consultas de avisos se
  verificaron por HTTP; no se verificó su entrega WebSocket ni se desplegó en el
  entorno institucional.
