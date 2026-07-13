import type { AuthPrincipal } from './identity-provider.port';
import type { GlobalRole } from '@nexiora/shared';

export interface AppUser {
  readonly id: string;
  readonly clerkId: string | null;
  readonly email: string;
  readonly displayName: string | null;
  readonly role: GlobalRole;
}

/**
 * Port: local user directory (Prisma adapter).
 */
export interface UserDirectoryPort {
  upsertFromPrincipal(principal: AuthPrincipal): Promise<AppUser>;
  findById(id: string): Promise<AppUser | null>;
}

export const USER_DIRECTORY_PORT = Symbol('USER_DIRECTORY_PORT');
