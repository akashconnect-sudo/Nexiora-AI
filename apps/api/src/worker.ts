import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { startTelemetry, shutdownTelemetry } from '@nexiora/telemetry';
import { WorkerModule } from './worker.module';

function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
    join(__dirname, '..', '..', '..', '.env'),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      loadDotenv({ path: file, override: false });
    }
  }
}

loadEnvFiles();

async function bootstrap(): Promise<void> {
  await startTelemetry(process.env.OTEL_SERVICE_NAME?.trim() || 'nexiora-worker');

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const logger = app.get(Logger);
  logger.log('Nexiora worker context started');

  const shutdown = async (signal: string) => {
    logger.log(`Worker received ${signal}; draining`);
    await app.close();
    await shutdownTelemetry();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
