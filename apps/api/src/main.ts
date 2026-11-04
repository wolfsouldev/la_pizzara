import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { LogLevel } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { env } from './config/environment';
import { ApiExceptionFilter, ApiResponseInterceptor, ZodValidationPipe } from './common/http';

async function bootstrap() {
  const levels: Record<typeof env.LOG_LEVEL, LogLevel[]> = {
    error: ['error'], warn: ['error', 'warn'], info: ['error', 'warn', 'log'], debug: ['error', 'warn', 'log', 'debug', 'verbose'],
  };
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: levels[env.LOG_LEVEL] });
  app.set('trust proxy', env.TRUST_PROXY ? env.TRUST_PROXY.split(',').map(s => s.trim()) : false);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  if (env.NODE_ENV === 'development') {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Plataforma Universitaria · MVP').setVersion('1.7').addCookieAuth('uni.sid', { type: 'apiKey', in: 'cookie' }, 'session').build());
    SwaggerModule.setup('api/docs', app, document);
  }
  app.enableShutdownHooks();
  await app.listen(env.APP_PORT, env.APP_HOST);
}
bootstrap().catch(() => { console.error('No se pudo iniciar la API; revisa la configuración y los registros'); process.exitCode = 1; });
