import { Module } from '@nestjs/common';
import { DepartmentsRepository } from '../../database/repositories/departments.repository';
import { CategoriesRepository } from '../../database/repositories/categories.repository';
import { UsersRepository } from '../../database/repositories/users.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { DepartmentAccessPolicy } from '../../common/policies/department-access.policy';
import { DepartmentsService } from '../departments/departments.service';
import { CategoriesService } from '../categories/categories.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { DepartmentsController } from '../departments/departments.controller';
import { CategoriesController, CatalogController } from '../categories/categories.controller';
import { UsersController } from '../users/users.controller';
import { AuditController } from '../audit/audit.controller';
@Module({ controllers: [DepartmentsController, CategoriesController, CatalogController, UsersController, AuditController],
  providers: [DepartmentsRepository, CategoriesRepository, UsersRepository, AuditRepository, DatabaseUnitOfWork, DepartmentAccessPolicy, DepartmentsService, CategoriesService, UsersService, AuditService] })
export class AdministrationModule {}
