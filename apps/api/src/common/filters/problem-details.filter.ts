import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../errors/domain-error';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url?: string; id?: string }>();

    if (exception instanceof DomainError) {
      response.status(exception.status).json({
        type: `https://api.nexiora.ai/errors/${exception.code.toLowerCase()}`,
        title: exception.message,
        status: exception.status,
        detail: exception.message,
        instance: request.url,
        code: exception.code,
        ...(exception.details ?? {}),
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const detail =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);

      response.status(status).json({
        type: `https://api.nexiora.ai/errors/http`,
        title: exception.message,
        status,
        detail: Array.isArray(detail) ? detail.join(', ') : detail,
        instance: request.url,
        code: status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'HTTP_ERROR',
      });
      return;
    }

    this.logger.error(exception);

    const prismaMessage = prismaConnectivityMessage(exception);
    if (prismaMessage) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        type: 'https://api.nexiora.ai/errors/database_unavailable',
        title: 'Database unavailable',
        status: 503,
        detail: prismaMessage,
        instance: request.url,
        code: 'PROVIDER_UNAVAILABLE',
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      type: 'https://api.nexiora.ai/errors/internal',
      title: 'Internal server error',
      status: 500,
      detail: 'An unexpected error occurred',
      instance: request.url,
      code: 'INTERNAL',
    });
  }
}

function prismaConnectivityMessage(exception: unknown): string | null {
  const message =
    exception && typeof exception === 'object' && 'message' in exception
      ? String((exception as { message: unknown }).message)
      : String(exception ?? '');
  const name =
    exception && typeof exception === 'object' && 'name' in exception
      ? String((exception as { name: unknown }).name)
      : '';

  const looksLikeDbOutage =
    name.includes('PrismaClientInitializationError') ||
    name.includes('PrismaClientKnownRequestError') ||
    /can't reach database server/i.test(message) ||
    /timed out fetching a new connection from the connection pool/i.test(message) ||
    /server has closed the connection/i.test(message) ||
    /P1001|P1017|P2024/.test(message);

  if (!looksLikeDbOutage) return null;

  return 'Database is unreachable. Check DATABASE_URL / Supabase project status, then try again.';
}
