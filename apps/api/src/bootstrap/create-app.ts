import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';
import express from 'express';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../app.module';
import { ProblemDetailsFilter } from '../common/filters/problem-details.filter';
import { AppConfigService } from './app-config.service';

export type NexioraHttpApp = {
  nest: INestApplication;
  express: Express;
};

/**
 * Shared Nest bootstrap for local `listen` and Vercel serverless.
 */
export async function createNexioraApp(): Promise<NexioraHttpApp> {
  const expressApp = express();
  const nest = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
    rawBody: true,
  });

  const logger = nest.get(Logger);
  nest.useLogger(logger);
  nest.useGlobalFilters(new ProblemDetailsFilter());

  const config = nest.get(AppConfigService);

  nest.setGlobalPrefix('v1', {
    exclude: ['health', 'ready', 'docs', 'docs-json', 'openapi.json'],
  });

  nest.enableCors({
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

  const document = SwaggerModule.createDocument(nest, swagger);
  SwaggerModule.setup('docs', nest, document);

  const http = nest.getHttpAdapter();
  http.get('/openapi.json', (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json(document);
  });
  http.get('/', (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json({
      name: 'Nexiora AI API',
      status: 'ok',
      health: '/health',
      docs: '/docs',
      openapi: '/openapi.json',
      web: config.publicWebUrl,
    });
  });

  await nest.init();
  return { nest, express: expressApp };
}
