import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { BillingService } from './application/billing.service';
import { BillingController } from './presentation/billing.controller';

@Module({
  imports: [IdentityModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
