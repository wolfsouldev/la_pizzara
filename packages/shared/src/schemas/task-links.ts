import { z } from 'zod';
import { priorities, ticketStatuses } from '../constants';
import { taskCreateSchema } from './kanban';
export const taskTicketLinkCreateSchema = z.strictObject({ ticketId: z.uuid() });
export const taskFromTicketCreateSchema = taskCreateSchema.extend({ boardId: z.uuid() });
export type TaskFromTicketCreate = z.infer<typeof taskFromTicketCreateSchema>;
export const linkedTicketSchema = z.object({ ticketId: z.uuid(), publicNumber: z.string(), title: z.string(), status: z.enum(ticketStatuses), priority: z.enum(priorities), createdById: z.uuid(), createdAt: z.number(), canUnlink: z.boolean() });
export const linkedTaskSchema = z.object({ taskId: z.uuid(), boardId: z.uuid(), boardName: z.string(), columnName: z.string(), title: z.string(), priority: z.enum(priorities), archivedAt: z.number().nullable(), boardArchived: z.boolean(), createdById: z.uuid(), createdAt: z.number(), canUnlink: z.boolean() });
