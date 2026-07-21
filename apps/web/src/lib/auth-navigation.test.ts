import { describe, expect, it } from 'vitest';
import { safeNextPath } from './auth-navigation';

describe('safeNextPath', () => {
  it('keeps valid internal destinations', () => {
    expect(safeNextPath('/search?q=policy')).toBe('/search?q=policy');
    expect(safeNextPath('/settings/subscription')).toBe('/settings/subscription');
  });

  it('rejects external and protocol-relative redirects', () => {
    expect(safeNextPath('https://example.com')).toBe('/dashboard');
    expect(safeNextPath('//example.com')).toBe('/dashboard');
  });

  it('does not redirect back into the authentication flow', () => {
    expect(safeNextPath('/sign-in?next=/sign-in')).toBe('/dashboard');
    expect(safeNextPath('/auth/complete')).toBe('/dashboard');
  });
});
