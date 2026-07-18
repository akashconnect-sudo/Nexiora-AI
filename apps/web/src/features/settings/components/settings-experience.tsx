'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@nexiora/ui';
import { authHeaders, clearSession, getSessionUser, type SessionUser } from '@/lib/session';
import { DEFAULT_PREFS, loadPrefs, savePrefs, type UserPrefs } from '@/lib/prefs';
import { apiUrl } from '@/lib/api-url';

const SECTIONS = [
  'account',
  'security',
  'preferences',
  'notifications',
  'privacy',
  'billing',
] as const;
type Section = (typeof SECTIONS)[number];

type Subscription = {
  planId: string;
  status: string;
  currentPeriodEnd?: string;
  source?: string;
  accessGranted?: boolean;
  activationFeeInr?: number;
};

type Invoice = {
  id: string;
  number: string | null;
  label?: string;
  status: string | null;
  amountPaid: number;
  currency: string;
  createdAt: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
  kind?: 'invoice' | 'receipt';
};

export function SettingsExperience({ initialSection = 'account' }: { initialSection?: Section }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [section, setSection] = useState<Section>(initialSection);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);

  useEffect(() => {
    const session = getSessionUser();
    if (!session) {
      router.replace('/sign-in?next=/settings');
      return;
    }
    setUser(session);
    setPrefs(loadPrefs());
    void loadBilling();
  }, [router]);

  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') return;
    setSection('billing');
    setBillingMessage('Payment received. Your bill will appear below in a moment.');
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      void loadBilling();
      if (attempts >= 6) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [searchParams]);

  async function loadBilling() {
    const headers = authHeaders();
    const [subResponse, invoiceResponse] = await Promise.all([
      fetch(apiUrl('/v1/billing/subscription'), { headers }),
      fetch(apiUrl('/v1/billing/invoices'), { headers }),
    ]);
    if (subResponse.ok) setSubscription((await subResponse.json()) as Subscription);
    if (invoiceResponse.ok) {
      const body = (await invoiceResponse.json()) as { invoices: Invoice[] };
      setInvoices(body.invoices);
    }
  }

  function updatePrefs(next: UserPrefs) {
    setPrefs(next);
    savePrefs(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  async function startCheckout(planId: 'free' | 'pro' | 'business') {
    setBillingBusy(true);
    setBillingMessage(null);
    try {
      const response = await fetch(apiUrl('/v1/billing/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ planId }),
      });
      const body = (await response.json()) as { url?: string; message?: string; detail?: string };
      if (response.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      setBillingMessage(body.message ?? body.detail ?? 'Checkout is not available.');
    } finally {
      setBillingBusy(false);
    }
  }

  async function openPortal() {
    setBillingBusy(true);
    setBillingMessage(null);
    try {
      const response = await fetch(apiUrl('/v1/billing/portal'), {
        method: 'POST',
        headers: authHeaders(),
      });
      const body = (await response.json()) as { url?: string; detail?: string };
      if (response.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      setBillingMessage(body.detail ?? 'Billing portal is not available.');
    } finally {
      setBillingBusy(false);
    }
  }

  if (!user) return <div className="p-8 text-sm text-nx-muted">Loading settings…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-nx-accent">Settings</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-nx-ink">
            Your Nexiora workspace
          </h1>
          <p className="mt-2 text-sm text-nx-muted">
            Manage your account, search experience, privacy, and plan.
          </p>
        </div>
        {saved ? <span className="text-sm font-medium text-nx-accent">Changes saved</span> : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Settings sections">
          {SECTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSection(item)}
              className={`whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm capitalize transition ${
                section === item
                  ? 'bg-nx-accent text-white'
                  : 'border border-nx-border bg-nx-elevated text-nx-muted hover:text-nx-ink'
              }`}
            >
              {item === 'billing' ? 'Billing & payments' : item}
            </button>
          ))}
        </nav>

        <main className="min-w-0 rounded-2xl border border-nx-border bg-nx-elevated p-5 sm:p-7">
          {section === 'account' ? (
            <SettingsSection title="Account" description="Your identity and profile information.">
              <InfoRow label="Name" value={user.displayName || 'Not set'} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Account ID" value={user.id} mono />
            </SettingsSection>
          ) : null}

          {section === 'security' ? (
            <SettingsSection
              title="Security"
              description="Review this session and protect account access."
            >
              <InfoRow label="Authentication" value="Email one-time code" />
              <InfoRow label="Current session" value="Active on this device" />
              <p className="mt-5 text-sm leading-6 text-nx-muted">
                Nexiora never asks for your one-time sign-in code outside the sign-in screen.
              </p>
              <Button
                variant="secondary"
                className="mt-5"
                onClick={() => {
                  clearSession();
                  router.push('/');
                }}
              >
                Sign out of this device
              </Button>
            </SettingsSection>
          ) : null}

          {section === 'preferences' ? (
            <SettingsSection
              title="Preferences"
              description="Choose how Nova looks and starts a search."
            >
              <FieldLabel label="Theme">
                <div className="flex flex-wrap gap-2">
                  {(['light', 'dark', 'system'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTheme(item)}
                      className={`rounded-lg px-3 py-2 text-sm capitalize ${
                        theme === item
                          ? 'bg-nx-accent text-white'
                          : 'border border-nx-border text-nx-muted'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </FieldLabel>
              <FieldLabel label="Default search mode">
                <select
                  value={prefs.defaultMode}
                  onChange={(event) =>
                    updatePrefs({
                      ...prefs,
                      defaultMode: event.target.value as UserPrefs['defaultMode'],
                    })
                  }
                  className="h-11 w-full rounded-lg border border-nx-border bg-nx-bg px-3 text-sm text-nx-ink"
                >
                  <option value="universal">Universal</option>
                  <option value="research">Research</option>
                  <option value="news">News</option>
                </select>
              </FieldLabel>
              <Toggle
                label="Open citations in a new tab"
                checked={prefs.openCitationsInNewTab}
                onChange={(checked) => updatePrefs({ ...prefs, openCitationsInNewTab: checked })}
              />
            </SettingsSection>
          ) : null}

          {section === 'notifications' ? (
            <SettingsSection
              title="Notifications"
              description="Control the product messages you want to receive."
            >
              <Toggle
                label="Product updates"
                checked={prefs.productUpdates}
                onChange={(checked) => updatePrefs({ ...prefs, productUpdates: checked })}
              />
              <Toggle
                label="Usage and quota alerts"
                checked={prefs.quotaAlerts}
                onChange={(checked) => updatePrefs({ ...prefs, quotaAlerts: checked })}
              />
              <Toggle
                label="Tips and marketing emails"
                checked={prefs.marketingEmails}
                onChange={(checked) => updatePrefs({ ...prefs, marketingEmails: checked })}
              />
            </SettingsSection>
          ) : null}

          {section === 'privacy' ? (
            <SettingsSection
              title="Privacy"
              description="Set safer defaults for retrieved content."
            >
              <FieldLabel label="Safe Search">
                <select
                  value={prefs.safeSearch}
                  onChange={(event) =>
                    updatePrefs({
                      ...prefs,
                      safeSearch: event.target.value as UserPrefs['safeSearch'],
                    })
                  }
                  className="h-11 w-full rounded-lg border border-nx-border bg-nx-bg px-3 text-sm text-nx-ink"
                >
                  <option value="strict">Strict</option>
                  <option value="moderate">Moderate</option>
                  <option value="off">Off</option>
                </select>
              </FieldLabel>
              <p className="mt-5 text-sm leading-6 text-nx-muted">
                Search queries and usage metadata may be retained for history, safety, and abuse
                prevention.
              </p>
              <div className="mt-4 flex gap-4 text-sm">
                <Link href="/privacy" className="text-nx-accent hover:underline">
                  Privacy policy
                </Link>
                <Link href="/terms" className="text-nx-accent hover:underline">
                  Terms
                </Link>
              </div>
            </SettingsSection>
          ) : null}

          {section === 'billing' ? (
            <SettingsSection
              title="Billing & payments"
              description="Activate access, manage your plan, and view invoices."
            >
              {!subscription?.accessGranted ? (
                <div className="mb-6 rounded-xl border border-nx-accent/40 bg-nx-accent-soft/30 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-nx-accent">
                    Payment required
                  </p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-nx-ink">
                    Pay $2 to activate Free access
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-nx-muted">
                    You can sign in, but Nova Search unlocks only after the Free activation payment.
                  </p>
                  <Button
                    className="mt-5"
                    disabled={billingBusy}
                    onClick={() => void startCheckout('free')}
                  >
                    Pay $2 &amp; activate Free
                  </Button>
                </div>
              ) : null}

              <div className="rounded-xl border border-nx-border bg-nx-bg/50 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-nx-muted">Current plan</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-semibold capitalize text-nx-ink">
                      {subscription?.accessGranted ? subscription.planId : 'Free (locked)'}
                    </p>
                    <p className="text-sm capitalize text-nx-muted">
                      {subscription?.accessGranted ? subscription.status : 'Payment required'}
                    </p>
                  </div>
                  {subscription?.accessGranted && subscription.planId !== 'free' ? (
                    <Button
                      variant="secondary"
                      disabled={billingBusy}
                      onClick={() => void openPortal()}
                    >
                      Manage payment
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <PlanCard
                  name="Free"
                  price="$2 one-time"
                  description="Activate limited Free searches."
                  onClick={() => void startCheckout('free')}
                  busy={billingBusy}
                />
                <PlanCard
                  name="Pro"
                  price="$20/month"
                  description="Higher limits and research tools."
                  onClick={() => void startCheckout('pro')}
                  busy={billingBusy}
                />
                <PlanCard
                  name="Business"
                  price="$80/month"
                  description="Team-ready capacity and workspaces."
                  onClick={() => void startCheckout('business')}
                  busy={billingBusy}
                />
              </div>
              {billingMessage ? (
                <p className="mt-4 rounded-lg border border-nx-border p-3 text-sm text-nx-muted">
                  {billingMessage}
                </p>
              ) : null}

              <div className="mt-8">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-nx-ink">
                    Bills & invoices
                  </h3>
                  <Button
                    variant="secondary"
                    disabled={billingBusy}
                    onClick={() => void loadBilling()}
                  >
                    Refresh
                  </Button>
                </div>
                <p className="mt-1 text-sm text-nx-muted">
                  Every successful payment (including $2 Free activation) appears here instantly.
                </p>
                {invoices.length ? (
                  <ul className="mt-3 divide-y divide-nx-border rounded-xl border border-nx-border">
                    {invoices.map((invoice) => (
                      <li
                        key={invoice.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                      >
                        <div>
                          <p className="font-medium text-nx-ink">
                            {invoice.label ?? invoice.number ?? invoice.id}
                          </p>
                          <p className="text-nx-muted">
                            {new Date(invoice.createdAt).toLocaleString()} · {invoice.status}
                            {invoice.kind === 'receipt' ? ' · receipt' : ' · invoice'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-nx-ink">
                            {new Intl.NumberFormat(undefined, {
                              style: 'currency',
                              currency: invoice.currency.toUpperCase(),
                            }).format(invoice.amountPaid / 100)}
                          </span>
                          {invoice.hostedUrl ? (
                            <a
                              href={invoice.hostedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-nx-accent hover:underline"
                            >
                              View bill
                            </a>
                          ) : null}
                          {invoice.pdfUrl ? (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-nx-accent hover:underline"
                            >
                              Download
                            </a>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-nx-border p-5 text-sm text-nx-muted">
                    No bills yet. After you pay $2 (or any plan), your bill shows up here
                    automatically.
                  </p>
                )}
              </div>
            </SettingsSection>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold text-nx-ink">{title}</h2>
      <p className="mt-1 text-sm text-nx-muted">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-nx-border py-4 first:pt-0 sm:flex-row sm:justify-between">
      <span className="text-sm text-nx-muted">{label}</span>
      <span
        className={`${mono ? 'font-mono text-xs' : 'text-sm font-medium'} break-all text-nx-ink`}
      >
        {value}
      </span>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-5 block max-w-lg text-sm text-nx-muted">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-nx-border py-4">
      <span className="text-sm font-medium text-nx-ink">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--nx-accent)]"
      />
    </label>
  );
}

function PlanCard({
  name,
  price,
  description,
  onClick,
  busy,
}: {
  name: string;
  price: string;
  description: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-xl border border-nx-border p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-nx-ink">{name}</h3>
        <span className="text-sm text-nx-muted">{price}</span>
      </div>
      <p className="mt-2 text-sm text-nx-muted">{description}</p>
      <Button className="mt-5 w-full" disabled={busy} onClick={onClick}>
        Choose {name}
      </Button>
    </div>
  );
}
