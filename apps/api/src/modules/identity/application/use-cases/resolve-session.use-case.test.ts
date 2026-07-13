import { describe, expect, it, vi } from 'vitest';
import { ResolveSessionUseCase } from './resolve-session.use-case';
import type { IdentityProviderPort } from '../ports/identity-provider.port';
import type { UserDirectoryPort } from '../ports/user-directory.port';

describe('ResolveSessionUseCase', () => {
  it('returns null when the identity provider rejects the token', async () => {
    const identityProvider: IdentityProviderPort = {
      verifyAccessToken: vi.fn().mockResolvedValue(null),
    };
    const users: UserDirectoryPort = {
      upsertFromPrincipal: vi.fn(),
      findById: vi.fn(),
    };

    const useCase = new ResolveSessionUseCase(identityProvider, users);
    await expect(useCase.execute('bad')).resolves.toBeNull();
    expect(users.upsertFromPrincipal).not.toHaveBeenCalled();
  });

  it('upserts the local user when the token is valid', async () => {
    const identityProvider: IdentityProviderPort = {
      verifyAccessToken: vi.fn().mockResolvedValue({
        subjectId: 'user_123',
        email: 'maya@nexiora.ai',
        displayName: 'Maya',
        avatarUrl: null,
        emailVerified: true,
      }),
    };
    const users: UserDirectoryPort = {
      upsertFromPrincipal: vi.fn().mockResolvedValue({
        id: 'local-uuid',
        clerkId: 'user_123',
        email: 'maya@nexiora.ai',
        displayName: 'Maya',
        role: 'USER',
      }),
      findById: vi.fn(),
    };

    const useCase = new ResolveSessionUseCase(identityProvider, users);
    const result = await useCase.execute('good-token');
    expect(result?.userId).toBe('local-uuid');
    expect(users.upsertFromPrincipal).toHaveBeenCalledOnce();
  });
});
