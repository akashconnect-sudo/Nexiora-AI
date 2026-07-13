import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../bootstrap/app-config.service';
import type {
  AuthPrincipal,
  IdentityProviderPort,
  VerifyTokenInput,
} from '../application/ports/identity-provider.port';
import { ClerkIdentityAdapter } from './clerk-identity.adapter';
import { LocalAuthService } from '../application/local-auth.service';

/**
 * Tries Nexiora local JWT first, then Clerk when configured.
 */
@Injectable()
export class CompositeIdentityAdapter implements IdentityProviderPort {
  private readonly logger = new Logger(CompositeIdentityAdapter.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly localAuth: LocalAuthService,
    private readonly clerk: ClerkIdentityAdapter,
  ) {}

  async verifyAccessToken(input: VerifyTokenInput): Promise<AuthPrincipal | null> {
    const local = await this.localAuth.verifyAccessToken(input.bearerToken);
    if (local) {
      return local;
    }

    if (this.config.clerkConfigured) {
      return this.clerk.verifyAccessToken(input);
    }

    this.logger.debug('No identity provider accepted the bearer token');
    return null;
  }
}
