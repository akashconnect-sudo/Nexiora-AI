import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Express } from 'express';
import { createNexioraApp } from './bootstrap/create-app';

let cachedExpress: Express | undefined;
let bootstrapPromise: Promise<Express> | undefined;

async function getExpressApp(): Promise<Express> {
  if (cachedExpress) return cachedExpress;
  if (!bootstrapPromise) {
    bootstrapPromise = createNexioraApp()
      .then(({ express }) => {
        cachedExpress = express;
        return express;
      })
      .catch((error) => {
        bootstrapPromise = undefined;
        throw error;
      });
  }
  return bootstrapPromise;
}

/**
 * Vercel serverless entry — every HTTP request is handled by the Nest Express app.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getExpressApp();
  app(req, res);
}
