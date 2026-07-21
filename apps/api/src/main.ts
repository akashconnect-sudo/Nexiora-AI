import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { startTelemetry, shutdownTelemetry } from '@nexiora/telemetry';
import { AppConfigService } from './bootstrap/app-config.service';
import { createNexioraApp } from './bootstrap/create-app';

/** Load monorepo root + local .env before ConfigModule validates. */
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
  await startTelemetry(process.env.OTEL_SERVICE_NAME?.trim() || 'nexiora-api');

  const { nest } = await createNexioraApp();
  const config = nest.get(AppConfigService);
  nest.enableShutdownHooks();

  const shutdown = async (signal: string) => {
    console.log(`API received ${signal}; shutting down`);
    await nest.close();
    await shutdownTelemetry();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await nest.listen(config.apiPort, config.apiHost);
  console.log(`Nexiora API listening on ${config.apiHost}:${config.apiPort}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal bootstrap error', error);
  process.exit(1);
});
