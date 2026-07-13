import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { ResolveSessionUseCase } from '../../identity/application/use-cases/resolve-session.use-case';

export type OptionalAuthRequest = Request & {
  userId?: string | null;
};

/**
 * Attaches userId when a valid bearer token is present; otherwise continues anonymously.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly resolveSession: ResolveSessionUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    request.userId = null;
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return true;
    }
    const token = header.slice('Bearer '.length).trim();
    const session = await this.resolveSession.execute(token);
    if (session) {
      request.userId = session.userId;
    }
    return true;
  }
}
