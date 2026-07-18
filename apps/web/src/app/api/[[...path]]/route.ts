import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { createResponse } from 'node-mocks-http';
// External CJS package — must stay in serverExternalPackages (not webpack-bundled).
import { loadNexioraExpress } from '@nexiora/nest-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ExpressApp = {
  (req: unknown, res: unknown, next?: (err?: unknown) => void): void;
};

let cachedExpress: ExpressApp | undefined;
let bootstrapPromise: Promise<ExpressApp> | undefined;

async function getExpress(): Promise<ExpressApp> {
  if (cachedExpress) return cachedExpress;
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const express = (await loadNexioraExpress()) as ExpressApp;
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

/**
 * Build a real Readable IncomingMessage so Express body-parser gets data + end.
 * node-mocks-http createRequest() leaves POST bodies unread → handlers hang forever.
 */
function toNodeRequest(
  request: Request,
  pathname: string,
  search: string,
  body: Buffer,
): IncomingMessage {
  const headers: Record<string, string | string[] | undefined> = {
    'content-length': String(body.length),
  };
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const readable = Readable.from(body.length > 0 ? [body] : []);
  const req = readable as IncomingMessage;
  req.method = request.method;
  req.url = `${pathname}${search}`;
  req.headers = headers;
  // Nest rawBody / stripe webhook support
  (req as IncomingMessage & { rawBody?: Buffer }).rawBody = body;
  return req;
}

async function proxy(request: Request): Promise<Response> {
  try {
    const express = await getExpress();
    const url = new URL(request.url);
    const pathname = url.pathname.startsWith('/api') ? url.pathname.slice(4) || '/' : url.pathname;

    const bodyBuffer =
      request.method === 'GET' || request.method === 'HEAD'
        ? Buffer.alloc(0)
        : Buffer.from(await request.arrayBuffer());

    const req = toNodeRequest(request, pathname, url.search, bodyBuffer);
    const res = createResponse({ eventEmitter: EventEmitter });

    await new Promise<void>((resolve, reject) => {
      const done = () => resolve();
      res.on('end', done);
      res.on('finish', done);
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
