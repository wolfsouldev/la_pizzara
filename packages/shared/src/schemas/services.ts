import { z } from 'zod';
export const serviceStatuses = ['OPERATIONAL', 'DEGRADED', 'OUTAGE', 'MAINTENANCE', 'UNKNOWN'] as const;
export const serviceStatusLabels: Record<typeof serviceStatuses[number], string> = { OPERATIONAL: 'Operativo', DEGRADED: 'Con incidencias', OUTAGE: 'No disponible', MAINTENANCE: 'En mantenimiento', UNKNOWN: 'Sin confirmar' };
export const serviceAccessUrlSchema = z.string().trim().max(2048).refine(value => {
  if (!/^https?:\/\/[^\s\\]+$/i.test(value)) return false;
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) && !!url.hostname && !url.username && !url.password; }
  catch { return false; }
}, 'Usa una URL HTTP o HTTPS válida, sin credenciales');
const fields = { url: serviceAccessUrlSchema.nullable().optional(), name: z.string().trim().min(2).max(100), description: z.string().trim().min(1).max(3000), status: z.enum(serviceStatuses) };
export const serviceCreateSchema = z.strictObject({ ...fields, status: fields.status.default('UNKNOWN') });
export const servicePatchSchema = z.strictObject({ ...fields, isActive: z.boolean() }).partial().refine(v => Object.keys(v).length > 0, 'Indica al menos un cambio');
export const serviceListSchema = z.strictObject({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(200).optional(), status: z.enum(serviceStatuses).optional() });
export const adminServiceListSchema = serviceListSchema.extend({ publication: z.enum(['active', 'archived', 'all']).default('active') });
export const serviceNoteQuerySchema = serviceListSchema.pick({ page: true, limit: true });
export const serviceNoteCreateSchema = z.strictObject({ body: z.string().trim().min(1).max(5000), visibility: z.enum(['PUBLIC', 'INTERNAL']) });
export const universityServiceSchema = z.object({ id: z.uuid(), ...fields, url: serviceAccessUrlSchema.nullable(), isActive: z.boolean(), statusUpdatedAt: z.number(), createdAt: z.number(), updatedAt: z.number(), latestNote: z.string().nullable() });
export const serviceNoteSchema = z.object({ id: z.uuid(), body: z.string(), visibility: z.enum(['PUBLIC', 'INTERNAL']), createdAt: z.number() });
export const ticketServiceLinkSchema = z.strictObject({ serviceId: z.uuid().nullable() });
export const ticketServiceSchema = z.object({ service: universityServiceSchema.nullable(), canEdit: z.boolean() });
export type UniversityService = z.infer<typeof universityServiceSchema>;
export type ServiceCreate = z.infer<typeof serviceCreateSchema>;
export type ServicePatch = z.infer<typeof servicePatchSchema>;
export type ServiceList = z.infer<typeof serviceListSchema>;
export type AdminServiceList = z.infer<typeof adminServiceListSchema>;
export type ServiceNoteCreate = z.infer<typeof serviceNoteCreateSchema>;
export type ServiceStatus = typeof serviceStatuses[number];
