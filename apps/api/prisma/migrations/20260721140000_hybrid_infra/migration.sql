-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'DISPATCHED', 'FAILED');

-- CreateEnum
CREATE TYPE "IndexSyncStatus" AS ENUM ('PENDING', 'INDEXED', 'FAILED', 'TOMBSTONED');

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dispatchedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "trustScore" DECIMAL(5,2) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "author" TEXT,
    "language" TEXT,
    "openSearchStatus" "IndexSyncStatus" NOT NULL DEFAULT 'PENDING',
    "qdrantStatus" "IndexSyncStatus" NOT NULL DEFAULT 'PENDING',
    "embeddingModel" TEXT,
    "embeddingDims" INTEGER,
    "lastIndexedAt" TIMESTAMP(3),
    "lastEmbeddedAt" TIMESTAMP(3),
    "tombstonedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_queueName_jobId_key" ON "OutboxEvent"("queueName", "jobId");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateId_createdAt_idx" ON "OutboxEvent"("aggregateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceDocument_canonicalUrl_key" ON "SourceDocument"("canonicalUrl");

-- CreateIndex
CREATE INDEX "SourceDocument_domain_idx" ON "SourceDocument"("domain");

-- CreateIndex
CREATE INDEX "SourceDocument_openSearchStatus_updatedAt_idx" ON "SourceDocument"("openSearchStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "SourceDocument_qdrantStatus_updatedAt_idx" ON "SourceDocument"("qdrantStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "SourceDocument_contentHash_idx" ON "SourceDocument"("contentHash");
