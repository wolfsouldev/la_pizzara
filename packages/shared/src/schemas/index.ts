import { z } from 'zod';
export * from './auth';

export const healthSchema = z.strictObject({
  status: z.literal('ok'),
});
export type HealthStatus = z.infer<typeof healthSchema>;

export const uuidSchema = z.uuid();
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
});

export * from './administration';

export * from './tickets';

export * from './staff-tickets';

export * from './kanban';

export * from './task-links';

export * from './notifications';

export * from './services';

export * from './task-planning';
