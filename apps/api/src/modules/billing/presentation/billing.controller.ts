import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
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

  @Get('invoices')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  invoices(@Req() req: AuthenticatedRequest) {
    return this.billing.listInvoices(req.userId!);
  }

  @Post('checkout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  checkout(
    @Req() req: AuthenticatedRequest,
    @Body() body: { planId: 'free' | 'pro' | 'business' },
  ) {
    return this.billing.createCheckout(req.userId!, body.planId ?? 'free');
  }

  @Post('portal')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  portal(@Req() req: AuthenticatedRequest) {
    return this.billing.createPortal(req.userId!);
  }

  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.billing.handleWebhook(req.rawBody ?? Buffer.from(''), signature);
  }
}
