import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { ERROR_CODES } from '@nexiora/shared';
import { DomainError } from '../../../common/errors/domain-error';
import { AppConfigService } from '../../../bootstrap/app-config.service';
import type { AppUser, UserDirectoryPort } from './ports/user-directory.port';
import { USER_DIRECTORY_PORT } from './ports/user-directory.port';
import type { AuthPrincipal } from './ports/identity-provider.port';
import { OtpMailerAdapter } from '../infrastructure/otp-mailer.adapter';

/**
 * Email OTP local auth for environments without Clerk.
 * Challenge ids are signed JWTs so verify works across serverless instances.
 * When Resend/SMTP is configured, codes are emailed and never returned to the client.
 */
@Injectable()
export class LocalAuthService {
  private readonly logger = new Logger(LocalAuthService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly mailer: OtpMailerAdapter,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  async requestOtp(emailRaw: string): Promise<{
    challengeId: string;
    expiresInSec: number;
    delivery: 'dev_inbox' | 'email';
    message: string;
    devCode?: string;
  }> {
    const email = normalizeEmail(emailRaw);
    if (!email) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Enter a valid email address', 400);
    }

    const code = String(randomInt(100000, 999999));
    const expiresInSec = 10 * 60;
    const challengeId = await new SignJWT({
      typ: 'nexiora_otp',
      email,
      codeHash: hashCode(code, this.config.authJwtSecret),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('nexiora-local')
      .setAudience('nexiora-otp')
      .setIssuedAt()
      .setExpirationTime(`${expiresInSec}s`)
      .sign(this.secretKey());

    if (this.mailer.isConfigured) {
      try {
        await this.mailer.sendLoginCode(email, code);
        this.logger.log(`OTP emailed to ${email}`);
        return {
          challengeId,
          expiresInSec,
          delivery: 'email',
          message: `We sent a 6-digit code to ${email}.`,
        };
      } catch (error) {
        this.logger.error(`OTP email failed for ${email}: ${(error as Error).message}`);
        throw new DomainError(
          ERROR_CODES.PROVIDER_UNAVAILABLE,
          (error as Error).message?.includes('RESEND_API_KEY')
            ? (error as Error).message
            : 'Could not send the verification email. On Vercel set RESEND_API_KEY and redeploy.',
          502,
        );
      }
    }

    // Fallback only when no mail provider is configured (local bootstrap).
    this.logger.warn(`No email provider configured — returning OTP in API response for ${email}`);
    return {
      challengeId,
      expiresInSec,
      delivery: 'dev_inbox',
      message: 'Email delivery is not configured yet. Use the on-screen code for now.',
      devCode: code,
    };
  }

  async verifyOtp(
    challengeId: string,
    codeRaw: string,
  ): Promise<{
    accessToken: string;
    expiresInSec: number;
    user: AppUser;
  }> {
    let email: string;
    let codeHash: string;
    try {
      const { payload } = await jwtVerify(challengeId, this.secretKey(), {
        issuer: 'nexiora-local',
        audience: 'nexiora-otp',
      });
      if (
        payload.typ !== 'nexiora_otp' ||
        typeof payload.email !== 'string' ||
        typeof payload.codeHash !== 'string'
      ) {
        throw new Error('invalid otp challenge');
      }
      email = payload.email;
      codeHash = payload.codeHash;
    } catch {
      throw new DomainError(
        ERROR_CODES.UNAUTHORIZED,
        'Code expired or invalid. Request a new one.',
        401,
      );
    }

    const incoming = hashCode(String(codeRaw).trim(), this.config.authJwtSecret);
    if (!safeEqual(incoming, codeHash)) {
      throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Incorrect code', 401);
    }

    const principal: AuthPrincipal = {
      subjectId: `local_${email}`,
      email,
      displayName: email.split('@')[0] ?? email,
      avatarUrl: null,
      emailVerified: true,
    };

    const user = await this.users.upsertFromPrincipal(principal);
    return this.issueSession(user);
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

  async issueSession(user: AppUser): Promise<{
    accessToken: string;
    expiresInSec: number;
    user: AppUser;
  }> {
    const expiresInSec = 60 * 60 * 24 * 7;
    const accessToken = await this.signToken(user, expiresInSec);
    return { accessToken, expiresInSec, user };
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
