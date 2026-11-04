import { z } from 'zod';
import { kanbanPageSchema } from './kanban';
export const notificationListSchema = kanbanPageSchema.extend({ unreadOnly: z.enum(['true','false']).transform(v=>v==='true').default(false) });
export type NotificationList = z.infer<typeof notificationListSchema>;
export const notificationSchema = z.object({ id:z.uuid(), type:z.string(), title:z.string(), message:z.string(), resourceType:z.string().nullable(), resourceId:z.string().nullable(), readAt:z.number().nullable(), createdAt:z.number(), href:z.string().nullable() });
export const notificationCountSchema = z.object({ count:z.number().int().min(0) });
export const notificationReadAllSchema = z.object({ updated:z.number().int().min(0) });
export type AppNotification = z.infer<typeof notificationSchema>;
