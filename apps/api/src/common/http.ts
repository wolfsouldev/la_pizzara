import { ArgumentsHost, ArgumentMetadata, CallHandler, Catch, ExceptionFilter, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor, PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import type { Response } from 'express';
import { map } from 'rxjs';
import { PaginatedResult } from './pagination';

export class ZodPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}
  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) throw new HttpException({ code: 'VALIDATION_ERROR', message: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }, 422);
    return result.data;
  }
}
// DTO classes declare a static Zod schema; the global pipe parses and strips no
// fields implicitly: use z.strictObject in shared request contracts.
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const metatype = metadata.metatype;
    if (!metatype || !('schema' in metatype)) return value;
    const schema: unknown = metatype.schema;
    if (!(schema instanceof z.ZodType)) throw new Error('El DTO declara un esquema Zod no válido');
    return new ZodPipe(schema).transform(value);
  }
}
@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) { return next.handle().pipe(map((data: unknown) => data instanceof PaginatedResult ? data : ({ data }))); }
}
const codes: Record<number, string> = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE', 422: 'VALIDATION_ERROR', 429: 'RATE_LIMITED', 503: 'SERVICE_UNAVAILABLE' };
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const constraint = error instanceof Error && 'code' in error && String(error.code).startsWith('SQLITE_CONSTRAINT');
    // Express body-parser errors are not Nest HttpExceptions. Never log their
    // message: malformed JSON can include fragments of submitted credentials.
    const parserType = error instanceof Error && 'type' in error ? error.type : undefined;
    const parserStatus = parserType === 'entity.parse.failed' ? 400 : parserType === 'entity.too.large' ? 413 : undefined;
    const status = error instanceof HttpException ? error.getStatus() : parserStatus ?? (constraint ? 409 : 500);
    const body = error instanceof HttpException ? error.getResponse() : undefined;
    let message = typeof body === 'string' ? body : body && typeof body === 'object' && 'message' in body ? String(body.message) : constraint ? 'La operación entra en conflicto con datos existentes' : 'Error interno del servidor';
    // JSON parser errors can contain fragments of a submitted password.
    if (status === 400) message = 'Solicitud no válida';
    if (status === 413) message = 'El cuerpo de la solicitud es demasiado grande';
    if (status === 500) { message = 'Error interno del servidor'; this.logger.error(error instanceof Error ? error.message : 'Unexpected error'); }
    response.status(status).json({ error: { code: body && typeof body === 'object' && 'code' in body ? String(body.code) : codes[status] ?? 'INTERNAL_ERROR', message } });
  }
}
