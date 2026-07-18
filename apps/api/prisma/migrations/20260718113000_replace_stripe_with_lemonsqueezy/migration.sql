-- Replace the unused Stripe test integration with Lemon Squeezy.
DROP INDEX IF EXISTS "Subscription_stripeCustomerId_key";
DROP INDEX IF EXISTS "Subscription_stripeSubId_key";

ALTER TABLE "Plan"
  DROP COLUMN "stripePriceId",
  ADD COLUMN "lemonSqueezyVariantId" TEXT;

ALTER TABLE "Subscription"
  DROP COLUMN "stripeCustomerId",
  DROP COLUMN "stripeSubId",
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'lemonsqueezy',
  ADD COLUMN "externalCustomerId" TEXT,
  ADD COLUMN "externalSubscriptionId" TEXT,
  ADD COLUMN "externalOrderId" TEXT,
  ADD COLUMN "variantId" TEXT;

-- Stripe only contained test purchases, so require a Lemon Squeezy payment
-- before access is granted after the provider cutover.
UPDATE "Subscription"
SET
  "planId" = 'free',
  "status" = 'unpaid',
  "currentPeriodEnd" = NULL,
  "provider" = 'lemonsqueezy';

CREATE UNIQUE INDEX "Subscription_externalCustomerId_key"
  ON "Subscription"("externalCustomerId");
CREATE UNIQUE INDEX "Subscription_externalSubscriptionId_key"
  ON "Subscription"("externalSubscriptionId");

CREATE TABLE "BillingWebhookEvent" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "resourceId" TEXT,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingWebhookEvent_eventKey_key"
  ON "BillingWebhookEvent"("eventKey");
CREATE INDEX "BillingWebhookEvent_provider_processedAt_idx"
  ON "BillingWebhookEvent"("provider", "processedAt" DESC);
