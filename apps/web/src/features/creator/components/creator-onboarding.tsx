'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nexiora/ui';
import { creatorFetch } from '@/lib/creator-api';
import { getSessionUser } from '@/lib/session';

const PERMISSIONS = [
  {
    key: 'youtube_channel',
    title: 'YouTube Channel',
    body: 'Read public channel metadata and, later, Analytics you explicitly authorize.',
  },
  {
    key: 'google_account',
    title: 'Google Account',
    body: 'Optional sign-in with Google. We never open Drive or Gmail.',
  },
  {
    key: 'google_trends',
    title: 'Google Trends',
    body: 'Use trend interest for your niches when you turn this on.',
  },
  {
    key: 'nexiora_search_history',
    title: 'Your Nexiora searches',
    body: 'Personalize ideas from searches you run inside Nexiora.',
  },
  {
    key: 'saved_topics',
    title: 'Saved topics',
    body: 'Use topics you save to bias daily opportunities.',
  },
  {
    key: 'bookmarks',
    title: 'Bookmarks',
    body: 'Learn from sources you bookmark in the library.',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    body: 'Alert you when opportunity scores spike or breaking news matches your niche.',
  },
] as const;

type PermState = Record<(typeof PERMISSIONS)[number]['key'], boolean>;

export function CreatorOnboarding() {
  const router = useRouter();
  const [niche, setNiche] = useState('AI News');
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('en');
  const [country, setCountry] = useState('US');
  const [perms, setPerms] = useState<PermState>({
    youtube_channel: false,
    google_account: false,
    google_trends: false,
    nexiora_search_history: true,
    saved_topics: true,
    bookmarks: true,
    notifications: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSessionUser()) {
      router.replace('/sign-in?next=/creator/onboarding');
      return;
    }
    const user = getSessionUser();
    if (user?.displayName) setDisplayName(user.displayName);
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await creatorFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: displayName || undefined,
          niche,
          language,
          country,
          preferredLengthMinutes: 12,
        }),
      });
      await creatorFetch('/permissions', {
        method: 'PATCH',
        body: JSON.stringify({ permissions: perms }),
      });
      router.push('/creator');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-nx-accent">Onboarding</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-nx-ink">Create your Creator Profile</h1>
      <p className="mt-2 text-sm leading-relaxed text-nx-muted">
        We only use what you allow. YouTube performance details stay off until you connect your
        channel.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        <section className="creator-glass rounded-2xl border border-nx-border/70 p-5">
          <h2 className="font-display text-lg font-semibold text-nx-ink">Basics</h2>
          <label className="mt-4 block text-sm text-nx-muted">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-nx border border-nx-border bg-nx-bg px-3 text-nx-ink outline-none focus:ring-2 focus:ring-nx-accent"
            />
          </label>
          <label className="mt-4 block text-sm text-nx-muted">
            Primary niche
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. AI News, Cyber Security"
              required
              className="mt-1.5 h-11 w-full rounded-nx border border-nx-border bg-nx-bg px-3 text-nx-ink outline-none focus:ring-2 focus:ring-nx-accent"
            />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-nx-muted">
              Language
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-nx border border-nx-border bg-nx-bg px-3 text-nx-ink"
              />
            </label>
            <label className="block text-sm text-nx-muted">
              Country
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-nx border border-nx-border bg-nx-bg px-3 text-nx-ink"
              />
            </label>
          </div>
        </section>

        <section className="creator-glass rounded-2xl border border-nx-border/70 p-5">
          <h2 className="font-display text-lg font-semibold text-nx-ink">Permissions</h2>
          <p className="mt-1 text-sm text-nx-muted">Toggle only what you want Nexiora to use.</p>
          <ul className="mt-4 space-y-3">
            {PERMISSIONS.map((item) => (
              <li key={item.key}>
                <label className="flex cursor-pointer gap-3 rounded-xl border border-nx-border/50 bg-nx-bg/40 p-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={perms[item.key]}
                    onChange={(e) => setPerms((p) => ({ ...p, [item.key]: e.target.checked }))}
                  />
                  <span>
                    <span className="block text-sm font-medium text-nx-ink">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-nx-muted">{item.body}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        {error ? <p className="text-sm text-nx-danger">{error}</p> : null}

        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? 'Saving…' : 'Save and open dashboard'}
        </Button>
      </form>
    </div>
  );
}
