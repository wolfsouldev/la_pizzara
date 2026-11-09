import { z } from 'zod';
import { UserRole } from '../constants';

const fields = {
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa minúsculas, números y guiones'),
  description: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
};
export const departmentCreateSchema = z.strictObject(fields);
export const departmentPatchSchema = departmentCreateSchema.partial().refine(v => Object.keys(v).length > 0, 'Indica al menos un cambio');
export const categoryCreateSchema = z.strictObject({ ...fields, departmentId: z.uuid() });
export const categoryPatchSchema = departmentPatchSchema;
export const memberCreateSchema = z.strictObject({ userId: z.uuid() });
// SUPER_ADMIN is never assignable through HTTP. Its only elevation path is the
// explicit, audited server-side CLI command.
export const userRoleSchema = z.strictObject({ role: z.enum([UserRole.USER, UserRole.TECHNICIAN, UserRole.ADMIN]) });
export const userStatusSchema = z.strictObject({ isActive: z.boolean() });
export const adminListSchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});
export const categoryListSchema = adminListSchema.extend({ departmentId: z.uuid().optional() });
export const userListSchema = adminListSchema.extend({ role: z.enum(UserRole).optional() });
export const catalogCategorySchema = z.strictObject({ departmentId: z.uuid().optional() });
export type DepartmentInput = z.infer<typeof departmentCreateSchema>;
export type DepartmentPatch = z.infer<typeof departmentPatchSchema>;
export type CategoryInput = z.infer<typeof categoryCreateSchema>;
export type AdminList = z.infer<typeof adminListSchema>;
export type UserList = z.infer<typeof userListSchema>;
export type CategoryList = z.infer<typeof categoryListSchema>;

export const departmentSchema = z.object({ id: z.uuid(), name: z.string(), slug: z.string(), description: z.string().nullable(), isActive: z.boolean(), createdAt: z.number(), updatedAt: z.number() });
export const categorySchema = departmentSchema.extend({ departmentId: z.uuid(), departmentName: z.string() });
export const managedUserSchema = z.object({ id: z.uuid(), authProvider: z.enum(['local', 'ldap']), username: z.string(), displayName: z.string(), email: z.string().nullable(), role: z.enum(UserRole), isActive: z.boolean(), lastLoginAt: z.number().nullable(), createdAt: z.number(), updatedAt: z.number() });
export const memberSchema = managedUserSchema.extend({ joinedAt: z.number() });
export const userDetailSchema = managedUserSchema.extend({ departments: z.array(departmentSchema) });
export const auditLogSchema = z.object({ id: z.uuid(), actorId: z.string().nullable(), actorName: z.string().nullable(), action: z.string(), entityType: z.string(), entityId: z.string().nullable(), metadata: z.record(z.string(), z.unknown()).nullable(), createdAt: z.number() });
export const pageMetaSchema = z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() });
export function pageSchema<T extends z.ZodType>(item: T) { return z.object({ data: z.array(item), meta: pageMetaSchema }); }
export type Department = z.infer<typeof departmentSchema>;
export type Category = z.infer<typeof categorySchema>;
export type ManagedUser = z.infer<typeof managedUserSchema>;
