# Chat de la solicitud

Cada detalle de ticket incluye una conversación pequeña entre el solicitante y el personal autorizado. Los comentarios anteriores se muestran en el chat sin migración ni pérdida de historial.

## Uso

- **Mis solicitudes → ticket:** escribe una duda, queja o información adicional y pulsa **Enviar**. Enter introduce una línea; Ctrl/⌘+Enter envía. Máximo 5000 caracteres, sin contraseñas ni información sensible.
- **Todos los tickets / Mis tickets → ticket:** ADMIN y técnico responsable pueden responder. Los demás técnicos con acceso de lectura consultan la conversación, sin enviar mensajes.
- El personal puede elegir **Respuesta pública** o **Nota interna**. Las notas se identifican con candado y fondo ámbar; nunca aparecen en el portal del solicitante. Tras guardar una nota se mantiene ese modo, para evitar publicar accidentalmente el siguiente borrador.
- Los mensajes se ordenan de antiguos a nuevos, agrupados por día. **Cargar mensajes anteriores** recupera páginas del servidor. Si estás leyendo atrás, una respuesta nueva muestra **Nuevos mensajes**, sin llevarte automáticamente al final.
- **En vivo** indica que el transporte está conectado. Si cae, el historial guardado permanece; se ofrece reconectar y se reconcilia por HTTP. El borrador permanece en memoria durante actualizaciones y reconexiones; no se almacena en localStorage y se pierde al recargar o salir del detalle.
- Un error de envío conserva el borrador. Si hubo un corte de red, comprueba el historial antes de reenviar: no hay reintentos automáticos de POST ni garantía de envío exactamente una vez.
- Cerrar una solicitud deja el chat de solo lectura. El historial público/interno de cambios del ticket sigue disponible por separado.

## Implementación y límites

`TicketChat.tsx` usa React Hook Form/Zod, TanStack Query y los endpoints de comentarios existentes. Reutiliza la conexión Socket.IO de la sesión; WebSocket avisa y HTTP recupera los mensajes. SQLite guarda comentarios/eventos transaccionalmente antes de emitir. Detalles en [realtime.md](realtime.md).

No es un chat global ni anónimo. No añade archivos adjuntos, presencia, recibos de lectura, mensajes de voz o notificaciones push con la web cerrada. No cambia permisos, credenciales ni AD. Publicación institucional y login LDAPS real siguen pendientes.

[Evidencia local](verification/ticket-chat.md).
