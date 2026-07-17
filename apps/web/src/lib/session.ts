const TOKEN_KEY = 'nexiora_access_token';
const USER_KEY = 'nexiora_user';
const SESSION_COOKIE = 'nexiora_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSession(accessToken: string, user: SessionUser): void {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `${SESSION_COOKIE}=1; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  window.dispatchEvent(new Event('nexiora-auth-changed'));
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  window.dispatchEvent(new Event('nexiora-auth-changed'));
}

export function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
