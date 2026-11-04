import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { SessionService } from '../../modules/auth/session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService, private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext) {
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    if (this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const session = await this.sessions.resolve(request);
    if (!session) throw new UnauthorizedException('Inicia sesión para continuar');
    request.sessionContext = session;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) this.sessions.assertCsrf(request, session);
    return true;
  }
}
