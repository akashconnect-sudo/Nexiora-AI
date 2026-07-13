import { Inject, Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '../ports/identity-provider.port';
import {
  IDENTITY_PROVIDER_PORT,
  type IdentityProviderPort,
} from '../ports/identity-provider.port';
import { UserDirectoryPort, USER_DIRECTORY_PORT } from '../ports/user-directory.port';

export interface ResolveSessionResult {
  readonly principal: AuthPrincipal;
  readonly userId: string;
}

/**
 * Use case: verify bearer token and upsert local user projection.
 */
@Injectable()
export class ResolveSessionUseCase {
  constructor(
    @Inject(IDENTITY_PROVIDER_PORT)
    private readonly identityProvider: IdentityProviderPort,
    @Inject(USER_DIRECTORY_PORT)
    private readonly users: UserDirectoryPort,
  ) {}

  async execute(bearerToken: string): Promise<ResolveSessionResult | null> {
    const principal = await this.identityProvider.verifyAccessToken({ bearerToken });
    if (!principal) {
      return null;
    }

    const user = await this.users.upsertFromPrincipal(principal);
    return { principal, userId: user.id };
  }
}
