import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { ERROR_CODES } from '@nexiora/shared';
import { DomainError } from '../../../common/errors/domain-error';
import { AppConfigService } from '../../../bootstrap/app-config.service';
import type { AppUser, UserDirectoryPort } from './ports/user-directory.port';
import { USER_DIRECTORY_PORT } from './ports/user-directory.port';
import { Inject } from '@nestjs/common';
import type { AuthPrincipal } from './ports/identity-provider.port';

interface Challenge {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

/**
 * Email OTP local auth for environments without Clerk.
 * In development, the OTP is returned once so local login works without SMTP.
 */
@Injectable()
export class LocalAuthService {
  private readonly logger = new Logger(LocalAuthService.name);
  private readonly challenges = new Map<string, Challenge>();

  constructor(
    private readonly config: AppConfigService,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  async requestOtp(emailRaw: string): Promise<{
    challengeId: string;
    expiresInSec: number;
    delivery: 'dev_inbox' | 'email';
    devCode?: string;
  }> {
    const email = normalizeEmail(emailRaw);
    if (!email) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Enter a valid email address', 400);
    }

    const code = String(randomInt(100000, 999999));
    const challengeId = randomUUID();
    const expiresInSec = 10 * 60;

    this.challenges.set(challengeId, {
      email,
      codeHash: hashCode(code, this.config.authJwtSecret),
      expiresAt: Date.now() + expiresInSec * 1000,
      attempts: 0,
    });

    this.logger.log(`Local OTP issued for ${email} (challenge ${challengeId})`);

    const isDev = this.config.nodeEnv !== 'production';
    return {
      challengeId,
      expiresInSec,
      delivery: isDev ? 'dev_inbox' : 'email',
      ...(isDev ? { devCode: code } : {}),
    };
  }

  async verifyOtp(challengeId: string, codeRaw: string): Promise<{
    accessToken: string;
    expiresInSec: number;
    user: AppUser;
  }> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Code expired or invalid. Request a new one.', 401);
    }
    if (challenge.expiresAt < Date.now()) {
      this.challenges.delete(challengeId);
      throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Code expired. Request a new one.', 401);
    }
    if (challenge.attempts >= 5) {
      this.challenges.delete(challengeId);
      throw new DomainError(ERROR_CODES.RATE_LIMITED, 'Too many attempts. Request a new code.', 429);
    }

    challenge.attempts += 1;
    const incoming = hashCode(String(codeRaw).trim(), this.config.authJwtSecret);
    if (!safeEqual(incoming, challenge.codeHash)) {
      throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Incorrect code', 401);
    }

    this.challenges.delete(challengeId);

    const principal: AuthPrincipal = {
      subjectId: `local_${challenge.email}`,
      email: challenge.email,
      displayName: challenge.email.split('@')[0] ?? challenge.email,
      avatarUrl: null,
      emailVerified: true,
    };

    const user = await this.users.upsertFromPrincipal(principal);
    const expiresInSec = 60 * 60 * 24 * 7;
    const accessToken = await this.signToken(user, expiresInSec);

    return { accessToken, expiresInSec, user };
  }

  async verifyAccessToken(token: string): Promise<AuthPrincipal | null> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey(), {
        issuer: 'nexiora-local',
        audience: 'nexiora-api',
      });
      if (payload.typ !== 'nexiora_local' || typeof payload.sub !== 'string') {
        return null;
      }
      const email = typeof payload.email === 'string' ? payload.email : null;
      return {
        subjectId: payload.sub,
        email,
        displayName: typeof payload.name === 'string' ? payload.name : null,
        avatarUrl: null,
        emailVerified: true,
      };
    } catch {
      return null;
    }
  }

  private async signToken(user: AppUser, expiresInSec: number): Promise<string> {
    return new SignJWT({
      typ: 'nexiora_local',
      email: user.email,
      name: user.displayName,
      uid: user.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.clerkId ?? `local_${user.email}`)
      .setIssuer('nexiora-local')
      .setAudience('nexiora-api')
      .setIssuedAt()
      .setExpirationTime(`${expiresInSec}s`)
      .sign(this.secretKey());
  }

  private secretKey(): Uint8Array {
    return new TextEncoder().encode(this.config.authJwtSecret);
  }
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function hashCode(code: string, secret: string): string {
  return createHmac('sha256', secret).update(code).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
