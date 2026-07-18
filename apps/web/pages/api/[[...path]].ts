import type { NextApiRequest, NextApiResponse } from 'next';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

function loadNestHandler(): (req: NextApiRequest, res: NextApiResponse) => unknown {
  const candidates = [
    // Copied next to the web app during Vercel build
    join(process.cwd(), 'nest-dist', 'vercel.js'),
    // Local monorepo path (apps/web → apps/api/dist)
    join(process.cwd(), '..', 'api', 'dist', 'vercel.js'),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(file) as {
        default?: (req: NextApiRequest, res: NextApiResponse) => unknown;
      };
      return (
        mod.default ?? (mod as unknown as (req: NextApiRequest, res: NextApiResponse) => unknown)
      );
    }
  }
  throw new Error(
    `Nest API build missing. Looked for: ${candidates.join(' | ')}. Ensure build runs @nexiora/api build.`,
  );
}

/**
 * Catch-all Pages API route that boots Nest Express (same Vercel project).
 * Rewrites send /v1/* and /health here as /api/v1/* and /api/health.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (typeof req.url === 'string' && req.url.startsWith('/api')) {
      req.url = req.url.slice(4) || '/';
    }
    const nest = loadNestHandler();
    return await nest(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[nexiora-api]', message);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'api_bootstrap_failed',
        message,
      });
    }
  }
}
