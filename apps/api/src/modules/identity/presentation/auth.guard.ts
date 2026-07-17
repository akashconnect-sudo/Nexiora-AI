import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ResolveSessionUseCase } from '../application/use-cases/resolve-session.use-case';

export type AuthenticatedRequest = Request & {
  userId?: string;
  principal?: {
    subjectId: string;
    email: string | null;
  };
};

/**
 * Bearer-token guard. Attach to protected controllers in Phase 1+.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly resolveSession: ResolveSessionUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        title: 'Missing bearer token',
      });
    }

    const token = header.slice('Bearer '.length).trim();
    const session = await this.resolveSession.execute(token);
    if (!session) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        title: 'Invalid or expired token',
      });
    }

    request.userId = session.userId;
    request.principal = {
      subjectId: session.principal.subjectId,
      email: session.principal.email,
    };
    return true;
  }
}
