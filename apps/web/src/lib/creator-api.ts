import { authHeaders } from '@/lib/session';
import { apiUrl } from '@/lib/api-url';

export async function creatorFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(`/v1/creator${path}`), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string; title?: string } | null;
    throw new Error(body?.detail ?? body?.title ?? 'Something went wrong. Please try again.');
  }
  return res.json() as Promise<T>;
}
