import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsService } from '../application/news.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'List recent news items' })
  list(
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.news.list({
      category,
      limit: Math.min(Number(limit ?? 20), 50),
    });
  }

  @Get('breaking')
  @ApiOperation({ summary: 'Breaking / most recent headlines' })
  breaking() {
    return this.news.list({ limit: 10 });
  }
}
