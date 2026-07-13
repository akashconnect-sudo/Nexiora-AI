import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { GlobalRole } from '@nexiora/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { AuthPrincipal } from '../application/ports/identity-provider.port';
import type { AppUser, UserDirectoryPort } from '../application/ports/user-directory.port';

/**
 * Prisma-backed user directory with in-memory fallback when the database is offline.
 */
@Injectable()
export class HybridUserDirectoryAdapter implements UserDirectoryPort {
  private readonly logger = new Logger(HybridUserDirectoryAdapter.name);
  private readonly memoryBySubject = new Map<string, AppUser>();
  private readonly memoryById = new Map<string, AppUser>();

  constructor(private readonly prisma: PrismaService) {}

  async upsertFromPrincipal(principal: AuthPrincipal): Promise<AppUser> {
    if (!principal.email) {
      throw new Error('Authenticated principal is missing an email address');
    }

    if (await this.canUsePrisma()) {
      try {
        const user = await this.prisma.user.upsert({
          where: { clerkId: principal.subjectId },
          create: {
            clerkId: principal.subjectId,
            email: principal.email,
            displayName: principal.displayName,
            avatarUrl: principal.avatarUrl,
            emailVerifiedAt: principal.emailVerified ? new Date() : null,
            lastLoginAt: new Date(),
          },
          update: {
            email: principal.email,
            displayName: principal.displayName,
            avatarUrl: principal.avatarUrl,
            emailVerifiedAt: principal.emailVerified ? new Date() : undefined,
            lastLoginAt: new Date(),
          },
        });
        const mapped = this.toAppUser(user);
        this.cache(principal.subjectId, mapped);
        return mapped;
      } catch (error) {
        this.logger.warn(`Prisma user upsert failed; using memory: ${(error as Error).message}`);
      }
    }

    const existing = this.memoryBySubject.get(principal.subjectId);
    const mapped: AppUser = {
      id: existing?.id ?? randomUUID(),
      clerkId: principal.subjectId,
      email: principal.email,
      displayName: principal.displayName,
      role: existing?.role ?? 'USER',
    };
    this.cache(principal.subjectId, mapped);
    return mapped;
  }

  async findById(id: string): Promise<AppUser | null> {
    const mem = this.memoryById.get(id);
    if (mem) return mem;

    if (!(await this.canUsePrisma())) return null;
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      return user ? this.toAppUser(user) : null;
    } catch {
      return null;
    }
  }

  private cache(subjectId: string, user: AppUser): void {
    this.memoryBySubject.set(subjectId, user);
    this.memoryById.set(user.id, user);
  }

  private async canUsePrisma(): Promise<boolean> {
    try {
      return await this.prisma.isHealthy();
    } catch {
      return false;
    }
  }

  private toAppUser(user: {
    id: string;
    clerkId: string | null;
    email: string;
    displayName: string | null;
    role: GlobalRole;
  }): AppUser {
    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }
}
