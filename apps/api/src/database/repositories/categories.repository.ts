import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, or, getTableColumns } from 'drizzle-orm';
import type { CategoryInput, CategoryList, DepartmentPatch } from '@uni/shared';
import { DatabaseService } from '../database.service';
import { departments, ticketCategories as categories } from '../schema';
import { contains } from './list-query';
const fields = { ...getTableColumns(categories), departmentName: departments.name };
@Injectable()
export class CategoriesRepository {
  constructor(private readonly database: DatabaseService) {}
  get(id: string) { return this.database.db.select(fields).from(categories).innerJoin(departments, eq(categories.departmentId, departments.id)).where(eq(categories.id, id)).get(); }
  catalog(departmentId?: string) { return this.database.db.select(fields).from(categories).innerJoin(departments, eq(categories.departmentId, departments.id)).where(and(eq(categories.isActive, true), eq(departments.isActive, true), departmentId ? eq(categories.departmentId, departmentId) : undefined)).orderBy(departments.name, categories.name, categories.id).all(); }
  list(q: CategoryList) {
    const where = and(q.isActive !== undefined ? eq(categories.isActive, q.isActive) : undefined, q.departmentId ? eq(categories.departmentId, q.departmentId) : undefined,
      q.search ? or(contains(categories.name, q.search), contains(categories.slug, q.search)) : undefined);
    return { rows: this.database.db.select(fields).from(categories).innerJoin(departments, eq(categories.departmentId, departments.id)).where(where).orderBy(desc(categories.createdAt), categories.id).limit(q.limit).offset((q.page - 1) * q.limit).all(), total: this.database.db.select({ n: count() }).from(categories).where(where).get()!.n };
  }
  create(input: CategoryInput) { const now = Date.now(); const id = randomUUID(); this.database.db.insert(categories).values({ id, ...input, createdAt: now, updatedAt: now }).run(); return this.get(id)!; }
  update(id: string, patch: DepartmentPatch) { this.database.db.update(categories).set({ ...patch, updatedAt: Date.now() }).where(eq(categories.id, id)).run(); return this.get(id)!; }
}
