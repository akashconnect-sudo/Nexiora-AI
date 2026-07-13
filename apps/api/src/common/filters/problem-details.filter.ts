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
