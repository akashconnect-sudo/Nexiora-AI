import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, type AuthenticatedRequest } from '../../identity/presentation/auth.guard';
import { BillingService } from '../application/billing.service';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  listPlans() {
    return { plans: this.billing.listPlans() };
  }

  @Get('subscription')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  subscription(@Req() req: AuthenticatedRequest) {
    return this.billing.getSubscription(req.userId!);
  }

  @Post('checkout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  checkout(
    @Req() req: AuthenticatedRequest,
    @Body() body: { planId: 'pro' | 'business' },
  ) {
    return this.billing.createCheckout(req.userId!, body.planId ?? 'pro');
  }
}
