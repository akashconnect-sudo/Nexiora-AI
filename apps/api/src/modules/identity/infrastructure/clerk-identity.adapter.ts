import { Injectable, Logger } from '@nestjs/common';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { AppConfigService } from '../../../bootstrap/app-config.service';
import type {
  AuthPrincipal,
  IdentityProviderPort,
  VerifyTokenInput,
} from '../application/ports/identity-provider.port';

/**
 * Clerk adapter for IdentityProviderPort.
 * When CLERK_SECRET_KEY is empty (local Phase 0), verification returns null
 * and auth-required routes remain locked — never invents fake users.
 */
@Injectable()
export class ClerkIdentityAdapter implements IdentityProviderPort {
  private readonly logger = new Logger(ClerkIdentityAdapter.name);
  private readonly clerk;

  constructor(private readonly config: AppConfigService) {
    this.clerk = this.config.clerkConfigured
      ? createClerkClient({ secretKey: this.config.clerkSecretKey })
      : null;
  }

  async verifyAccessToken(input: VerifyTokenInput): Promise<AuthPrincipal | null> {
    if (!this.clerk || !this.config.clerkConfigured) {
      this.logger.debug('Clerk not configured; rejecting token verification');
      return null;
    }

    try {
      const payload = await verifyToken(input.bearerToken, {
        secretKey: this.config.clerkSecretKey,
      });

      const userId = payload.sub;
      if (!userId) {
        return null;
      }

      const user = await this.clerk.users.getUser(userId);
      const primaryEmail =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        null;
      const metadataDisplayName =
        typeof user.unsafeMetadata?.displayName === 'string'
          ? user.unsafeMetadata.displayName.trim()
          : '';

      return {
        subjectId: user.id,
        email: primaryEmail,
        displayName:
          metadataDisplayName ||
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.username ||
          null,
        avatarUrl: user.imageUrl ?? null,
        emailVerified: user.emailAddresses.some((e) => e.verification?.status === 'verified'),
      };
    } catch (error) {
      this.logger.warn(`Clerk token verification failed: ${(error as Error).message}`);
      return null;
    }
  }
}
