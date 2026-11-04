import { Body, Controller, Get, Header, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBody, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { loginSchema, type LoginInput } from '@uni/shared';
import { ZodPipe } from '../../common/http';
import { Public } from '../../common/decorators/auth';
import { env } from '../../config/environment';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly sessions: SessionService) {}

  @Public() @Get('csrf') @Header('Cache-Control', 'no-store')
  csrf(@Res({ passthrough: true }) res: Response) { return this.auth.prelogin(res); }

  @Public() @Post('login') @HttpCode(200) @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: env.LOGIN_RATE_LIMIT, ttl: env.LOGIN_RATE_WINDOW_SECONDS * 1000 } })
  @ApiBody({ schema: { type: 'object', additionalProperties: false, required: ['username', 'password'], properties: { username: { type: 'string', maxLength: 254 }, password: { type: 'string', format: 'password', maxLength: 1024 } } } })
  login(@Body(new ZodPipe(loginSchema)) body: LoginInput, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(body.username, body.password, req, res);
  }

  @Public() @Post('development-login') @HttpCode(200) @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: env.LOGIN_RATE_LIMIT, ttl: env.LOGIN_RATE_WINDOW_SECONDS * 1000 } })
  developmentLogin(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.developmentLogin(req, res); }

  @Get('me') @ApiCookieAuth('session')
  me(@Req() req: Request) { return this.auth.profile(req.sessionContext!); }

  @Post('logout') @HttpCode(204) @ApiCookieAuth('session')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { this.sessions.logout(req, res); }
}
