'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@nexiora/ui';
import { siteConfig } from '@/content/site';
import { clearSession, getSessionUser, authHeaders, type SessionUser } from '@/lib/session';
import { apiUrl } from '@/lib/api-url';

const NAV = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/creator', label: 'Creator', icon: 'creator' },
  { href: '/search', label: 'Search', icon: 'search' },
  { href: '/news', label: 'News', icon: 'news' },
  { href: '/library', label: 'Library', icon: 'library' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
] as const;

type UpgradeTarget = 'pro' | 'business';

function NavIcon({ name }: { name: (typeof NAV)[number]['icon'] }) {
  const common = 'h-[18px] w-[18px] shrink-0';
  switch (name) {
    case 'home':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case 'creator':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path d="M8 5.5v13M16 5.5v13M5 9.5h14M5 14.5h14" />
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
        </svg>
      );
    case 'search':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case 'news':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path d="M5 5h11a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2V5Z" />
          <path d="M7 9h9M7 13h6M18 7h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1" />
        </svg>
      );
    case 'library':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path d="M5 4h4v16H5zM10 4h4v16h-4zM16 6.5 20 5v14l-4 1.5V6.5Z" />
        </svg>
      );
    case 'settings':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.1l1.6 1.5M17.5 15.4l1.6 1.5M3.5 12h2.2M18.3 12h2.2M4.9 16.9l1.6-1.5M17.5 8.6l1.6-1.5" />
        </svg>
      );
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<UpgradeTarget | null>('pro');
  const [dismissedUpgrade, setDismissedUpgrade] = useState<UpgradeTarget | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const sync = () => {
      const session = getSessionUser();
      setUser(session);
      setAuthReady(true);
      if (!session) {
        router.replace(`/sign-in?next=${encodeURIComponent(pathname ?? '/')}`);
      }
    };
    sync();
    window.addEventListener('nexiora-auth-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('nexiora-auth-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(apiUrl('/v1/billing/subscription'), {
          headers: authHeaders(),
        });
        if (!response.ok || cancelled) return;
        const body = (await response.json()) as {
          accessGranted?: boolean;
          planId?: string;
        };
        const nextUpgrade: UpgradeTarget | null =
          body.accessGranted && body.planId === 'business'
            ? null
            : body.accessGranted && body.planId === 'pro'
              ? 'business'
              : 'pro';
        setUpgradeTarget(nextUpgrade);
        if (!body.accessGranted && !cancelled && !(pathname ?? '/').startsWith('/settings')) {
          router.replace('/settings/subscription');
        }
      } catch {
        // Keep the shell usable if billing is temporarily unreachable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, pathname, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isDark = mounted && resolvedTheme === 'dark';
  function logout() {
    clearSession();
    setUser(null);
    router.push('/');
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="App">
      {NAV.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/dashboard' && (pathname ?? '').startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-nx px-3 py-2.5 text-sm font-medium transition ${
              active
                ? 'bg-nx-accent-soft text-nx-accent'
                : 'text-nx-muted hover:bg-nx-elevated hover:text-nx-ink'
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  if (!authReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nx-bg px-4">
        <p className="text-sm text-nx-muted">Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-nx-bg">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-nx-border bg-nx-elevated/80 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-nx-border px-4">
          <Link
            href="/dashboard"
            className="font-display text-base font-semibold tracking-tight text-nx-ink"
          >
            {siteConfig.name}
          </Link>
        </div>
        <div className="flex flex-1 flex-col py-4">
          <p className="mb-2 px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-nx-muted">
            {siteConfig.product}
          </p>
          {nav}
        </div>
        <div className="border-t border-nx-border p-3">
          {user ? (
            <div className="rounded-nx bg-nx-bg/80 px-3 py-3">
              <p className="truncate text-sm font-medium text-nx-ink">
                {user.displayName || user.email.split('@')[0]}
              </p>
              <p className="mt-0.5 truncate text-xs text-nx-muted">{user.email}</p>
              <div className="mt-3 flex gap-2">
                <Link href="/settings" className="flex-1">
                  <Button variant="secondary" className="w-full text-xs">
                    Account
                  </Button>
                </Link>
                <Button variant="ghost" className="text-xs" onClick={logout}>
                  Log out
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 px-1">
              <Link href="/sign-in">
                <Button variant="secondary" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button className="w-full">Get started</Button>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-nx-border bg-nx-elevated transition-transform lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-nx-border px-4">
          <span className="font-display font-semibold">{siteConfig.name}</span>
          <button
            type="button"
            className="text-sm text-nx-muted"
            onClick={() => setMobileOpen(false)}
          >
            Close
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-4">{nav}</div>
        <div className="border-t border-nx-border p-4">
          <p className="truncate text-sm font-medium text-nx-ink">
            {user.displayName || user.email.split('@')[0]}
          </p>
          <p className="mt-0.5 truncate text-xs text-nx-muted">{user.email}</p>
          <div className="mt-3 flex gap-2">
            <Link href="/settings" className="flex-1">
              <Button variant="secondary" className="w-full">
                Account
              </Button>
            </Link>
            <Button variant="ghost" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {upgradeTarget && dismissedUpgrade !== upgradeTarget ? (
          <UpgradeBanner
            target={upgradeTarget}
            onClose={() => setDismissedUpgrade(upgradeTarget)}
          />
        ) : null}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-nx-border bg-nx-bg/90 px-3 backdrop-blur-md sm:gap-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="shrink-0 rounded-nx border border-nx-border px-2.5 py-1.5 text-sm text-nx-muted lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              Menu
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-nx-ink">
                {NAV.find(
                  (n) =>
                    pathname === n.href ||
                    (n.href !== '/dashboard' && (pathname ?? '').startsWith(n.href)),
                )?.label ?? 'Nova Search'}
              </p>
              <p className="hidden text-xs text-nx-muted sm:block">
                Cited answers · live news · your library
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              aria-label="Toggle color theme"
              disabled={!mounted}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {!mounted ? 'Theme' : isDark ? 'Light' : 'Dark'}
            </Button>
            <Link href="/search" className="hidden sm:inline">
              <Button>New search</Button>
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function UpgradeBanner({ target, onClose }: { target: UpgradeTarget; onClose: () => void }) {
  const isBusiness = target === 'business';

  return (
    <div className="relative z-40 overflow-hidden border-b border-nx-accent/25 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--nx-accent)_18%,var(--nx-bg)),var(--nx-bg-elevated),color-mix(in_srgb,var(--nx-accent)_12%,var(--nx-bg)))] px-3 py-2.5 sm:px-5">
      <div className="pointer-events-none absolute left-1/4 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-nx-accent/10 blur-2xl" />
      <div className="relative mx-auto flex max-w-6xl items-center gap-3">
        <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg border border-nx-accent/25 bg-nx-accent-soft text-nx-accent sm:grid">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
            aria-hidden="true"
          >
            {isBusiness ? (
              <>
                <path d="M4 20V8l8-4 8 4v12H4Z" />
                <path d="M9 20v-5h6v5M8 10h.01M12 10h.01M16 10h.01" />
              </>
            ) : (
              <>
                <path d="m12 3 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 3Z" />
                <path d="M8 21h8" />
              </>
            )}
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-nx-ink sm:text-sm">
            {isBusiness ? 'Ready to scale your team?' : 'Unlock the full Nexiora experience'}
          </p>
          <p className="hidden truncate text-xs text-nx-muted sm:block">
            {isBusiness
              ? 'Move to Business for team workspaces, higher capacity, and priority support.'
              : 'Upgrade to Pro for deeper research, higher limits, and more powerful answers.'}
          </p>
        </div>
        <Link
          href="/settings/subscription"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-nx-accent px-3 text-xs font-semibold text-white shadow-[0_7px_18px_color-mix(in_srgb,var(--nx-accent)_20%,transparent)] transition hover:-translate-y-0.5 hover:opacity-90"
        >
          {isBusiness ? 'View Business' : 'Explore Pro'}
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <path d="m6 3 5 5-5 5" />
          </svg>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Dismiss ${isBusiness ? 'Business' : 'Pro'} plan suggestion`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-nx-muted transition hover:bg-nx-accent-soft hover:text-nx-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
