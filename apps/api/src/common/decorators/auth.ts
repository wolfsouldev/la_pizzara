import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { UserRole } from '@uni/shared';
import type { User } from '../../database/schema';

export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): User => context.switchToHttp().getRequest<Request>().sessionContext!.user);
