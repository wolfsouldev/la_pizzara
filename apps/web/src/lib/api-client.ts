import type { ApiResponse } from '@uni/shared';
let csrfToken: string | undefined;
export function setCsrfToken(value?: string) { csrfToken = value; }
let onUnauthorized: (() => void) | undefined;
export function setUnauthorizedHandler(handler?: () => void) { onUnauthorized = handler; }

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: { ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken && options.method && !['GET', 'HEAD'].includes(options.method) ? { 'X-CSRF-Token': csrfToken } : {}) },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new ApiError(503, 'No se pudo conectar con el servicio. Inténtalo de nuevo.');
  }
  if (response.status === 204) return { data: undefined as T };

  let body: unknown;
  try { body = await response.json(); }
  catch { throw new ApiError(response.ok ? 502 : response.status, 'El servicio devolvió una respuesta no válida.'); }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.();
    const message = body && typeof body === 'object' && 'error' in body && body.error && typeof body.error === 'object' && 'message' in body.error
      ? String(body.error.message) : 'No se pudo completar la operación';
    throw new ApiError(response.status, message);
  }
  if (!body || typeof body !== 'object' || !('data' in body)) {
    throw new ApiError(502, 'No se pudo validar la respuesta del servicio.');
  }
  return body as ApiResponse<T>;
}
