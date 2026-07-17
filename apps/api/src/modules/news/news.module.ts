import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NewsService } from './application/news.service';
import { NewsController } from './presentation/news.controller';

@Module({
  imports: [IdentityModule],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
