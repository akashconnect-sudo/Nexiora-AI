import { Body, Controller, Get, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  EnrichCreatorSearchSchema,
  GenerateIdeasRequestSchema,
  PatchCreatorPermissionsSchema,
  UpsertCreatorProfileSchema,
} from '@nexiora/shared';
import { AuthGuard, type AuthenticatedRequest } from '../../identity/presentation/auth.guard';
import { CreatorService } from '../application/creator.service';

@ApiTags('creator')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('creator')
export class CreatorController {
  constructor(private readonly creator: CreatorService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get or create Creator profile' })
  profile(@Req() req: AuthenticatedRequest) {
    return this.creator.getOrCreateProfile(req.userId!, req.principal?.email);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update Creator profile fields' })
  upsert(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = UpsertCreatorProfileSchema.parse(body);
    return this.creator.upsertProfile(req.userId!, parsed);
  }

  @Patch('permissions')
  @ApiOperation({ summary: 'Grant or revoke Creator data permissions' })
  permissions(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = PatchCreatorPermissionsSchema.parse(body);
    return this.creator.patchPermissions(req.userId!, parsed.permissions);
  }

  @Get('dna')
  @ApiOperation({ summary: 'Creator DNA snapshot' })
  dna(@Req() req: AuthenticatedRequest) {
    return this.creator.getDna(req.userId!);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Personalized Creator Intelligence dashboard' })
  dashboard(@Req() req: AuthenticatedRequest) {
    return this.creator.getDashboard(req.userId!, req.principal?.email?.split('@')[0]);
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Ranked content opportunities' })
  opportunities(@Req() req: AuthenticatedRequest) {
    return this.creator.listOpportunities(req.userId!);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Trend discovery board' })
  trends(@Req() req: AuthenticatedRequest) {
    return this.creator.listTrends(req.userId!);
  }

  @Post('ideas')
  @ApiOperation({ summary: 'Generate multi-format content idea pack' })
  ideas(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = GenerateIdeasRequestSchema.parse(body);
    return this.creator.generateIdeas(req.userId!, parsed.topic, parsed.format);
  }

  @Post('search/enrich')
  @ApiOperation({ summary: 'Enrich a search query with creator recommendations' })
  enrich(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = EnrichCreatorSearchSchema.parse(body);
    return this.creator.enrich(req.userId!, parsed.query);
  }

  @Get('coach')
  @ApiOperation({ summary: 'AI growth coach tips' })
  coach(@Req() req: AuthenticatedRequest) {
    return this.creator.getCoach(req.userId!);
  }
}
