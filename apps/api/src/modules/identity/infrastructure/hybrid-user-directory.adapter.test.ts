import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { HybridUserDirectoryAdapter } from './hybrid-user-directory.adapter';

type StoredUser = {
  id: string;
  clerkId: string | null;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  role: 'USER';
};

describe('HybridUserDirectoryAdapter account linking', () => {
  it('links verified Clerk and OTP identities with the same email', async () => {
    const records: StoredUser[] = [];
    const prisma = {
      isHealthy: async () => true,
      user: {
        findUnique: async ({ where }: { where: Partial<StoredUser> }) =>
          records.find((record) =>
            Object.entries(where).every(
              ([key, value]) => record[key as keyof StoredUser] === value,
            ),
          ) ?? null,
        create: async ({ data }: { data: Omit<StoredUser, 'id' | 'role'> }) => {
          const record: StoredUser = { id: 'user-1', role: 'USER', ...data };
          records.push(record);
          return record;
        },
        update: async ({ where, data }: { where: { id: string }; data: Partial<StoredUser> }) => {
          const record = records.find((item) => item.id === where.id);
          if (!record) throw new Error('missing user');
          Object.assign(record, data);
          return record;
        },
      },
    } as unknown as PrismaService;
    const directory = new HybridUserDirectoryAdapter(prisma);

    const otpUser = await directory.upsertFromPrincipal({
      subjectId: 'local_person@example.com',
      email: 'person@example.com',
      displayName: 'Person',
      avatarUrl: null,
      emailVerified: true,
    });
    const googleUser = await directory.upsertFromPrincipal({
      subjectId: 'user_clerk-google',
      email: 'person@example.com',
      displayName: 'Person from Google',
      avatarUrl: 'https://example.com/avatar.png',
      emailVerified: true,
    });

    expect(records).toHaveLength(1);
    expect(googleUser.id).toBe(otpUser.id);
    expect(googleUser.clerkId).toBe('local_person@example.com');
    expect(googleUser.displayName).toBe('Person from Google');
  });
});
