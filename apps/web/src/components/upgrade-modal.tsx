'use client';

import Link from 'next/link';
import { Button } from '@nexiora/ui';

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
};

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-nx-accent/40 bg-nx-elevated p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-nx-accent/15 blur-3xl" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-nx-muted transition hover:bg-nx-border/50 hover:text-nx-ink"
          aria-label="Close upgrade dialog"
        >
          ×
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-nx-accent">
          Payment required
        </p>
        <h2 id="upgrade-title" className="mt-2 font-display text-2xl font-semibold text-nx-ink">
          Activate Free for $2
        </h2>
        <p className="mt-3 text-sm leading-6 text-nx-muted">
          You can stay signed in, but Nova Search unlocks only after payment. Start with Free ($2 one-time), or choose Pro / Business for higher limits.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-nx-accent/40 bg-nx-accent-soft/30 p-4">
            <p className="font-semibold text-nx-ink">Free</p>
            <p className="mt-1 text-sm text-nx-muted">$2 activation</p>
          </div>
          <div className="rounded-xl border border-nx-border p-4">
            <p className="font-semibold text-nx-ink">Pro</p>
            <p className="mt-1 text-sm text-nx-muted">$20 / month</p>
          </div>
          <div className="rounded-xl border border-nx-border p-4">
            <p className="font-semibold text-nx-ink">Business</p>
            <p className="mt-1 text-sm text-nx-muted">$80 / month</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/settings/subscription" className="flex-1">
            <Button className="w-full">Pay &amp; activate</Button>
          </Link>
          <Link href="/pricing" className="flex-1">
            <Button variant="secondary" className="w-full">View pricing</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
