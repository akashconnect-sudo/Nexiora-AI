import { apiUrl } from './api-url';

export function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  if (raw.startsWith('/sign-in') || raw.startsWith('/sign-up') || raw.startsWith('/auth/')) {
    return '/dashboard';
  }
  return raw;
}

export async function postAuthDestination(
  accessToken: string,
  requestedPath: string | null,
): Promise<string> {
  try {
    const response = await fetch(apiUrl('/v1/billing/subscription'), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.ok) {
      const subscription = (await response.json()) as { accessGranted?: boolean };
      if (!subscription.accessGranted) return '/settings/subscription';
    }
  } catch {
    // Authentication should still complete if billing is temporarily unavailable.
  }

  return safeNextPath(requestedPath);
}
