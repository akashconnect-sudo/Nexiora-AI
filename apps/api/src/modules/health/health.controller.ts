import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HealthResponse, ReadyResponse } from '@nexiora/shared';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'API prefix index' })
  getRoot() {
    return {
      name: 'Nexiora AI API',
      status: 'ok',
      health: '/health',
      docs: '/docs',
      web: 'http://localhost:3000',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'Process is alive' })
  getHealth(): HealthResponse {
    return this.health.liveness();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe (database + redis). OpenSearch/Qdrant are diagnostics only.',
  })
  async getReady(): Promise<ReadyResponse> {
    return this.health.readiness();
  }
}
