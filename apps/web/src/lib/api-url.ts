/**
 * Browser API base URL.
 *
 * On Vercel always use same-origin (`/v1/...`) so login never hits localhost
 * or the marketing HTML by mistake.
 * Locally defaults to http://localhost:3001 unless NEXT_PUBLIC_API_URL is set.
 */
export function apiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL) {
    return '';
  }

  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');
  if (!raw || raw === '.' || raw === '/') {
    return 'http://localhost:3001';
  }

  if (typeof window !== 'undefined') {
    try {
      if (new URL(raw).host === window.location.host) return '';
    } catch {
      /* ignore */
    }
  }

  return raw;
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
