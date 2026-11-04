import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, categoryCreateSchema, categoryPatchSchema, categoryListSchema, catalogCategorySchema, uuidSchema } from '@uni/shared';
import type { CategoryInput, CategoryList, DepartmentPatch } from '@uni/shared';
import type { User } from '../../database/schema';
import { Roles, CurrentUser } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import { CategoriesService } from './categories.service';
import { DepartmentsService } from '../departments/departments.service';
@ApiTags('categories') @ApiCookieAuth('session') @Roles(UserRole.ADMIN) @Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}
  @Get() list(@CurrentUser() u: User, @Query(new ZodPipe(categoryListSchema)) q: CategoryList) { return this.service.list(u, q); }
  @Post() create(@CurrentUser() u: User, @Body(new ZodPipe(categoryCreateSchema)) body: CategoryInput) { return this.service.create(u, body); }
  @Patch(':id') update(@CurrentUser() u: User, @Param('id', new ZodPipe(uuidSchema)) id: string, @Body(new ZodPipe(categoryPatchSchema)) body: DepartmentPatch) { return this.service.update(u, id, body); }
}
@ApiTags('catalog') @ApiCookieAuth('session') @Controller('catalog')
export class CatalogController {
  constructor(private readonly categories: CategoriesService, private readonly departments: DepartmentsService) {}
  @Get('departments') departmentsList() { return this.departments.catalog(); }
  @Get('categories') categoriesList(@Query(new ZodPipe(catalogCategorySchema)) q: { departmentId?: string }) { return this.categories.catalog(q.departmentId); }
}
