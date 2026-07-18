/**
 * Browser API base URL.
 *
 * Local: defaults to http://localhost:3001
 * Vercel (same project): same-origin `` so `/v1/...` hits Nest via rewrite
 * If NEXT_PUBLIC_API_URL points at this same site, also use same-origin
 * (avoids HTML login JSON parse errors).
 */
export function apiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');

  if (!raw || raw === '.' || raw === '/') {
    return process.env.VERCEL ? '' : 'http://localhost:3001';
  }

  if (typeof window !== 'undefined') {
    try {
      if (new URL(raw).host === window.location.host) return '';
    } catch {
      /* ignore invalid URL */
    }
  }

  return raw;
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
