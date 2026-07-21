'use client';

import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaManager() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));

    if (!standalone && /iphone|ipad|ipod/i.test(window.navigator.userAgent)) {
      setShowIosHelp(true);
    }

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => {
      setInstallPrompt(null);
      setShowIosHelp(false);
    };

    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', installed);

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => registration.update())
        .catch(() => {
          // Installation support should never block the web application.
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
    else setDismissed(true);
  }

  if (dismissed || (!installPrompt && !showIosHelp)) return null;

  return (
    <aside className="pwa-install-card" aria-label="Install Nexiora AI">
      <span className="pwa-install-icon" aria-hidden="true">
        <img src="/icon.png" alt="" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold text-nx-ink">Install Nexiora AI</p>
        <p className="mt-0.5 text-[11px] leading-4 text-nx-muted">
          {showIosHelp
            ? 'Tap Share, then “Add to Home Screen”.'
            : 'Open faster in a focused, app-like window.'}
        </p>
      </div>
      {installPrompt ? (
        <button type="button" className="pwa-install-action" onClick={() => void install()}>
          Install
        </button>
      ) : null}
      <button
        type="button"
        className="pwa-install-close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install suggestion"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </aside>
  );
}
