import { Injectable } from '@nestjs/common';
import type { GlobalRole } from '@nexiora/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { AuthPrincipal } from '../application/ports/identity-provider.port';
import type { AppUser, UserDirectoryPort } from '../application/ports/user-directory.port';

@Injectable()
export class PrismaUserDirectoryAdapter implements UserDirectoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsertFromPrincipal(principal: AuthPrincipal): Promise<AppUser> {
    if (!principal.email) {
      throw new Error('Authenticated principal is missing an email address');
    }

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

    return this.toAppUser(user);
  }

  async findById(id: string): Promise<AppUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toAppUser(user) : null;
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
