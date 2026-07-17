'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@nexiora/ui';
import { clearSession, getSessionUser, type SessionUser } from '@/lib/session';
import { DEFAULT_PREFS, loadPrefs, savePrefs, type UserPrefs } from '@/lib/prefs';

export function SettingsPanel() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMounted(true);
    const session = getSessionUser();
    if (!session) {
      router.replace('/sign-in?next=/settings');
      return;
    }
    setUser(session);
    setPrefs(loadPrefs());
  }, [router]);

  function updatePrefs(next: UserPrefs) {
    setPrefs(next);
    savePrefs(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  if (!user || !mounted) {
    return (
      <div className="px-4 py-16 sm:px-8">
        <p className="text-sm text-nx-muted">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-nx-accent">Settings</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-nx-ink">
        Account & preferences
      </h1>
      <p className="mt-2 text-sm text-nx-muted">
        Control how Nova Search looks and behaves on this device.
      </p>

      <section className="mt-10 rounded-nx border border-nx-border bg-nx-elevated p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-nx-ink">Profile</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="text-nx-muted">Name</dt>
            <dd className="font-medium text-nx-ink">{user.displayName || '—'}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="text-nx-muted">Email</dt>
            <dd className="font-medium text-nx-ink">{user.email}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="text-nx-muted">User ID</dt>
            <dd className="font-mono text-xs text-nx-muted">{user.id}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-nx border border-nx-border bg-nx-elevated p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-nx-ink">Appearance</h2>
        <p className="mt-1 text-sm text-nx-muted">Theme follows this browser only.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
              { id: 'system', label: 'System' },
            ] as const
          ).map((item) => {
            const active = theme === item.id || (!theme && item.id === 'system');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`rounded-nx px-3 py-2 text-sm ${
                  active
                    ? 'bg-nx-accent text-white'
                    : 'border border-nx-border text-nx-muted hover:text-nx-ink'
                }`}
              >
                {item.label}
                {item.id !== 'system' && resolvedTheme === item.id ? ' · on' : ''}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-nx border border-nx-border bg-nx-elevated p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-nx-ink">Search defaults</h2>
          {saved ? <span className="text-xs text-nx-accent">Saved</span> : null}
        </div>
        <label className="mt-4 block text-sm text-nx-muted" htmlFor="default-mode">
          Default mode for new searches
        </label>
        <select
          id="default-mode"
          value={prefs.defaultMode}
          onChange={(e) =>
            updatePrefs({
              ...prefs,
              defaultMode: e.target.value as UserPrefs['defaultMode'],
            })
          }
          className="mt-2 h-11 w-full rounded-nx border border-nx-border bg-nx-bg px-3 text-sm text-nx-ink outline-none focus:ring-2 focus:ring-nx-accent"
        >
          <option value="universal">Universal</option>
          <option value="research">Research</option>
          <option value="news">News</option>
        </select>

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={prefs.openCitationsInNewTab}
            onChange={(e) => updatePrefs({ ...prefs, openCitationsInNewTab: e.target.checked })}
          />
          <span>
            <span className="font-medium text-nx-ink">Open citations in a new tab</span>
            <span className="mt-0.5 block text-nx-muted">
              Keeps your answer visible while you verify a source.
            </span>
          </span>
        </label>
      </section>

      <section className="mt-6 rounded-nx border border-nx-border bg-nx-elevated p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-nx-ink">Session</h2>
        <p className="mt-1 text-sm text-nx-muted">
          Log out clears your session on this device. Your search history stays available when you
          sign back in.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            clearSession();
            router.push('/');
          }}
        >
          Log out
        </Button>
      </section>
    </div>
  );
}
