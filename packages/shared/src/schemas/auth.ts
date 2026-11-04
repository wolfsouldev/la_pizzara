import { z } from 'zod';
import { UserRole } from '../constants';

export const usernameSchema = z.string().trim().min(1).max(254).regex(/^[\p{L}\p{N}._@-]+$/u, 'Identificador no válido');
export const loginSchema = z.strictObject({ username: usernameSchema, password: z.string().min(1, 'Introduce tu contraseña').max(1024) });
export type LoginInput = z.infer<typeof loginSchema>;
export const sessionUserSchema = z.object({
  id: z.uuid(), username: z.string(), displayName: z.string(), email: z.string().nullable(),
  authProvider: z.enum(['local', 'ldap']), role: z.enum(UserRole),
  departments: z.array(z.object({ id: z.uuid(), name: z.string() })),
  csrfToken: z.string().regex(/^[a-f0-9]{64}$/),
  lastLoginAt: z.number().nullable(), sessionExpiresAt: z.number(), sessionAbsoluteExpiresAt: z.number(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
export const preloginSchema = z.object({ csrfToken: z.string(), provider: z.enum(['local', 'ldap']), developmentAccessAvailable: z.boolean() });
export type Prelogin = z.infer<typeof preloginSchema>;
