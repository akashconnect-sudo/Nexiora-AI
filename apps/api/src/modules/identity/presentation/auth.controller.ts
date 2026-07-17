import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from '../../../bootstrap/app-config.service';
import {
  USER_DIRECTORY_PORT,
  type UserDirectoryPort,
} from '../application/ports/user-directory.port';
import { LocalAuthService } from '../application/local-auth.service';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: AppConfigService,
    private readonly localAuth: LocalAuthService,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Identity provider configuration status (no secrets)' })
  getStatus() {
    return {
      providers: {
        local: true,
        clerk: this.config.clerkConfigured,
      },
      preferred: this.config.clerkConfigured ? 'clerk' : 'local',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('local/request')
  @ApiOperation({ summary: 'Request email OTP for local login' })
  requestLocal(@Body() body: { email?: string }) {
    return this.localAuth.requestOtp(body.email ?? '');
  }

  @Post('local/verify')
  @ApiOperation({ summary: 'Verify email OTP and issue access token' })
  verifyLocal(@Body() body: { challengeId?: string; code?: string }) {
    return this.localAuth.verifyOtp(body.challengeId ?? '', body.code ?? '');
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated user projection' })
  async me(@Req() req: AuthenticatedRequest) {
    const user = req.userId ? await this.users.findById(req.userId) : null;
    return { user };
  }
}
