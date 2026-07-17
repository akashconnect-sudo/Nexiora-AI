import { Module } from '@nestjs/common';
import { IDENTITY_PROVIDER_PORT } from './application/ports/identity-provider.port';
import { USER_DIRECTORY_PORT } from './application/ports/user-directory.port';
import { ResolveSessionUseCase } from './application/use-cases/resolve-session.use-case';
import { LocalAuthService } from './application/local-auth.service';
import { ClerkIdentityAdapter } from './infrastructure/clerk-identity.adapter';
import { CompositeIdentityAdapter } from './infrastructure/composite-identity.adapter';
import { HybridUserDirectoryAdapter } from './infrastructure/hybrid-user-directory.adapter';
import { OtpMailerAdapter } from './infrastructure/otp-mailer.adapter';
import { AuthController } from './presentation/auth.controller';
import { AuthGuard } from './presentation/auth.guard';
import { OptionalAuthGuard } from './presentation/optional-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    ResolveSessionUseCase,
    AuthGuard,
    OptionalAuthGuard,
    LocalAuthService,
    OtpMailerAdapter,
    ClerkIdentityAdapter,
    HybridUserDirectoryAdapter,
    CompositeIdentityAdapter,
    { provide: IDENTITY_PROVIDER_PORT, useExisting: CompositeIdentityAdapter },
    { provide: USER_DIRECTORY_PORT, useExisting: HybridUserDirectoryAdapter },
  ],
  exports: [
    ResolveSessionUseCase,
    AuthGuard,
    OptionalAuthGuard,
    LocalAuthService,
    IDENTITY_PROVIDER_PORT,
    USER_DIRECTORY_PORT,
  ],
})
export class IdentityModule {}
