import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createRequest, createResponse } from 'node-mocks-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ExpressApp = {
  (req: unknown, res: unknown, next?: (err?: unknown) => void): void;
};

type NestLoader = {
  loadNexioraExpress: () => Promise<ExpressApp>;
};

let cachedExpress: ExpressApp | undefined;
let bootstrapPromise: Promise<ExpressApp> | undefined;

/**
 * Load nest-loader.cjs with the real Node require.
 * Next/webpack must not rewrite this — otherwise exports become "b is not a function".
 */
function loadNestLoader(): NestLoader {
  const packageJson = join(process.cwd(), 'package.json');
  const nodeRequire = createRequire(packageJson);
  const candidates = [
    join(process.cwd(), 'nest-loader.cjs'),
    join(process.cwd(), 'apps', 'web', 'nest-loader.cjs'),
  ];

  let lastError: unknown;
  for (const file of candidates) {
    try {
      // Runtime-only require so bundlers cannot rewrite nest-loader exports.
      const mod = Function(
        'nodeRequire',
        'filePath',
        '"use strict"; return nodeRequire(filePath);',
      )(nodeRequire, file) as NestLoader & { default?: NestLoader };

      const loader =
        typeof mod?.loadNexioraExpress === 'function'
          ? mod
          : typeof mod?.default?.loadNexioraExpress === 'function'
            ? mod.default
            : null;

      if (!loader) {
        throw new Error(
          `nest-loader missing loadNexioraExpress (${file}). keys=${JSON.stringify(Object.keys(mod || {}))}`,
        );
      }
      return loader;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`nest-loader.cjs not found under ${process.cwd()}`);
}

async function getExpress(): Promise<ExpressApp> {
  if (cachedExpress) return cachedExpress;
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const loader = loadNestLoader();
      if (typeof loader.loadNexioraExpress !== 'function') {
        throw new Error('loadNexioraExpress is not a function after nest-loader resolve');
      }
      const express = await loader.loadNexioraExpress();
      if (typeof express !== 'function') {
        throw new Error(`Nest express app is not a function (got ${typeof express})`);
      }
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
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('[nexiora-api]', message, stack);
    return Response.json(
      {
        error: 'api_bootstrap_failed',
        message,
        stack,
        cwd: process.cwd(),
      },
      { status: 500 },
    );
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
