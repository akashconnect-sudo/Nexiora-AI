/**
 * Browser API base URL.
 *
 * In the browser always use same-origin (`/v1/...`):
 * - local: Next rewrites proxy to http://localhost:3001
 * - Vercel: rewrites to /api → Nest loader
 *
 * SSR / non-browser falls back to NEXT_PUBLIC_API_URL or localhost:3001.
 */
export function apiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '';
  }

  if (process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL) {
    return '';
  }

  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');
  if (!raw || raw === '.' || raw === '/') {
    return 'http://localhost:3001';
  }

  return raw;
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
