'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@nexiora/ui';
import { navLinks, siteConfig } from '@/content/site';
import { getSessionUser, type SessionUser } from '@/lib/session';
import { performLogout } from '@/lib/logout';

export function SiteHeader() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const sync = () => setUser(getSessionUser());
    sync();
    window.addEventListener('nexiora-auth-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('nexiora-auth-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <header className="sticky top-0 z-40 border-b border-nx-border/80 bg-nx-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight text-nx-ink">
            {siteConfig.name}
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-nx px-2.5 py-1.5 text-sm text-nx-muted hover:bg-nx-accent-soft hover:text-nx-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-nx border border-nx-border px-2.5 py-1.5 text-sm text-nx-muted md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
          >
            Menu
          </button>
          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              aria-label="Toggle color theme"
              disabled={!mounted}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {!mounted ? 'Theme' : isDark ? 'Light' : 'Dark'}
            </Button>
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button>Open app</Button>
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setUser(null);
                    void performLogout('/');
                  }}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="secondary">Log in</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      {mobileOpen ? (
        <nav className="border-t border-nx-border px-4 py-3 md:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-nx px-2 py-2 text-sm text-nx-muted hover:bg-nx-accent-soft"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {user ? (
              <li>
                <Link
                  href="/dashboard"
                  className="block rounded-nx px-2 py-2 text-sm font-medium text-nx-accent"
                  onClick={() => setMobileOpen(false)}
                >
                  Open app
                </Link>
              </li>
            ) : null}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-nx-border pt-3">
            <Button
              variant="ghost"
              aria-label="Toggle color theme"
              disabled={!mounted}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {!mounted ? 'Theme' : isDark ? 'Light mode' : 'Dark mode'}
            </Button>
            {user ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setUser(null);
                  void performLogout('/');
                }}
              >
                Log out
              </Button>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="secondary">Log in</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
