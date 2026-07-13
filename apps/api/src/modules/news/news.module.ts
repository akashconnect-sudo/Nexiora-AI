import { Module } from '@nestjs/common';
import { NewsService } from './application/news.service';
import { NewsController } from './presentation/news.controller';

@Module({
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
