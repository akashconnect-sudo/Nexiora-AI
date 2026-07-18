import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequest, createResponse } from 'node-mocks-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ExpressApp = {
  (req: unknown, res: unknown, next?: (err?: unknown) => void): void;
};

type NestCreateApp = {
  createNexioraApp: () => Promise<{ express: ExpressApp }>;
};

let cachedExpress: ExpressApp | undefined;
let bootstrapPromise: Promise<ExpressApp> | undefined;

function resolveCreateAppPath(): string {
  const candidates = [
    join(process.cwd(), 'nest-dist', 'bootstrap', 'create-app.js'),
    join(process.cwd(), '..', 'api', 'dist', 'bootstrap', 'create-app.js'),
  ];
  for (const file of candidates) {
    if (existsSync(file)) return file;
  }
  throw new Error(
    `Nest create-app missing. Looked for: ${candidates.join(' | ')}. Ensure @nexiora/api build + nest-dist copy ran.`,
  );
}

async function getExpress(): Promise<ExpressApp> {
  if (cachedExpress) return cachedExpress;
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(resolveCreateAppPath()) as NestCreateApp;
      const { express } = await mod.createNexioraApp();
      cachedExpress = express;
      return express;
    })().catch((error) => {
      bootstrapPromise = undefined;
      throw error;
    });
  }
  return bootstrapPromise;
}

async function proxy(request: Request): Promise<Response> {
  try {
    const express = await getExpress();
    const url = new URL(request.url);
    const pathname = url.pathname.startsWith('/api') ? url.pathname.slice(4) || '/' : url.pathname;

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const bodyBuffer =
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : Buffer.from(await request.arrayBuffer());

    const req = createRequest({
      method: request.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD',
      url: `${pathname}${url.search}`,
      headers,
      body: bodyBuffer,
    });

    const res = createResponse({ eventEmitter: EventEmitter });

    await new Promise<void>((resolve, reject) => {
      res.on('end', () => resolve());
      res.on('finish', () => resolve());
      res.on('error', reject);
      express(req, res, (error?: unknown) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const status = res.statusCode || 200;
    const rawHeaders = res.getHeaders();
    const outHeaders = new Headers();
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) outHeaders.append(key, String(item));
      } else {
        outHeaders.set(key, String(value));
      }
    }

    const data = res._getData() as string | Buffer | undefined;
    const body =
      typeof data === 'string'
        ? data
        : Buffer.isBuffer(data)
          ? new Uint8Array(data)
          : data == null
            ? null
            : String(data);

    return new Response(body, { status, headers: outHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[nexiora-api]', message);
    return Response.json({ error: 'api_bootstrap_failed', message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return proxy(request);
}
export async function POST(request: Request) {
  return proxy(request);
}
export async function PUT(request: Request) {
  return proxy(request);
}
export async function PATCH(request: Request) {
  return proxy(request);
}
export async function DELETE(request: Request) {
  return proxy(request);
}
export async function OPTIONS(request: Request) {
  return proxy(request);
}
