import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './bootstrap/app-config.service';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';

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
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalFilters(new ProblemDetailsFilter());

  const config = app.get(AppConfigService);

  app.setGlobalPrefix('v1', {
    exclude: ['health', 'ready', 'docs', 'docs-json', 'openapi.json'],
  });

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });

  const swagger = new DocumentBuilder()
    .setTitle('Nexiora AI API')
    .setDescription('Nova Search — AI Knowledge Platform API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Api-Key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, document);
  app.getHttpAdapter().get('/openapi.json', (_req, res) => {
    res.json(document);
  });

  await app.listen(config.apiPort, config.apiHost);
  logger.log(`Nexiora API listening on ${config.apiHost}:${config.apiPort}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal bootstrap error', error);
  process.exit(1);
});
