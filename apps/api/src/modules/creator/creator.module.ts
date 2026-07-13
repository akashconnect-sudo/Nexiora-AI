import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NewsModule } from '../news/news.module';
import { CreatorService } from './application/creator.service';
import { CreatorController } from './presentation/creator.controller';

@Module({
  imports: [IdentityModule, NewsModule],
  controllers: [CreatorController],
  providers: [CreatorService],
  exports: [CreatorService],
})
export class CreatorModule {}
