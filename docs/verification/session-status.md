# Presentación de sesión · 2026-11-08

Se sustituyó el mensaje plano de `ProtectedRoute` por `SessionStatusPage`: marca,
icono de conexión, tarjeta centrada oscura, error original y botón Reintentar.
Carga y error comparten presentación para no saltar al texto plano al reintentar.
No se modificaron consultas, contratos, cookies, autenticación ni permisos.

La entrada dura 300 ms; el icono tiene dos ciclos suaves de 2 s. Ambos se aplican
solo con `motion-safe`. El indicador de comprobación se muestra durante la petición,
y el botón queda deshabilitado mientras esta está en curso.

## Verificación

- `mise exec node@24.15.0 -- pnpm --filter web build`: tipado y build correctos.
  Persisten avisos no fatales de anotaciones PURE de Zod y bundle >500 kB.
- Chromium, frontend de revisión aislado en loopback5177. Se bloqueó únicamente
  `/api/v1/auth/me` mediante CDP para provocar un fallo real de red en el navegador;
  no se sirvieron respuestas ficticias ni se escribieron datos o sesiones.
- Error original visible: «No se puede conectar con la API».
- 1440×900 y 375×812: revisión visual; en móvil ancho de documento = ventana =375.
- Tab alcanza Reintentar. Durante la petición muestra Comprobando y queda deshabilitado.
- Con movimiento reducido, animación de entrada = none; con preferencia clara, el
  fondo sigue siendo rgb(16,17,20), oscuro permanente.
- Al retirar el bloqueo de navegador, la API local3000 seguía sin estar disponible
  (health sin respuesta), por lo que no se verificó recuperación hasta login/401.
  Se comprobó el regreso al error y disponibilidad de Reintentar tras fallar de nuevo.
- Sin excepciones JavaScript en la pasada final. No se detuvieron ni arrancaron
  servidores del usuario; se cerró solo el frontend5177 de revisión.

[Escritorio](session-status/desktop.png) · [Móvil](session-status/mobile.png).
