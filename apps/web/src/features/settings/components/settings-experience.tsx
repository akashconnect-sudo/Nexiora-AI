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
  activationFeeUsd?: number;
};

type Invoice = {
  id: string;
  number: string | null;
  label?: string;
  status: string | null;
  amountPaid: number;
  currency: string;
  createdAt: string;
  orderId?: string;
  paymentId?: string;
  planId?: 'free' | 'pro' | 'business';
  method?: string | null;
  email?: string | null;
  contact?: string | null;
  fee?: number | null;
  tax?: number | null;
  amountRefunded?: number;
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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

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
    if (searchParams?.get('checkout') !== 'success') return;
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

  useEffect(() => {
    if (!selectedInvoice) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedInvoice(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedInvoice]);

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
      const body = (await response.json().catch(() => ({}))) as {
        mode?: string;
        keyId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        name?: string;
        description?: string;
        prefill?: { email?: string; name?: string };
        url?: string;
        message?: string;
        detail?: string;
        error?: string;
      };
      if (response.ok && body.mode === 'razorpay' && body.keyId && body.orderId) {
        await openRazorpayCheckout({
          keyId: body.keyId,
          orderId: body.orderId,
          amount: body.amount ?? 0,
          currency: body.currency ?? 'USD',
          name: body.name ?? 'Nexiora AI',
          description: body.description ?? 'Nexiora payment',
          prefill: body.prefill,
          planId,
        });
        return;
      }
      if (response.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      setBillingMessage(body.detail ?? body.message ?? body.error ?? 'Checkout is not available.');
    } catch (error) {
      setBillingMessage((error as Error).message || 'Checkout is not available.');
    } finally {
      setBillingBusy(false);
    }
  }

  async function openRazorpayCheckout(input: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    prefill?: { email?: string; name?: string };
    planId: 'free' | 'pro' | 'business';
  }) {
    await loadRazorpayScript();
    const RazorpayCtor = window.Razorpay;
    if (!RazorpayCtor) {
      throw new Error('Razorpay checkout failed to load.');
    }

    await new Promise<void>((resolve, reject) => {
      const checkout = new RazorpayCtor({
        key: input.keyId,
        amount: input.amount,
        currency: input.currency,
        name: input.name,
        description: input.description,
        order_id: input.orderId,
        prefill: input.prefill,
        theme: { color: '#0f766e' },
        handler: async (response) => {
          try {
            const verifyResponse = await fetch(apiUrl('/v1/billing/verify'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: input.planId,
              }),
            });
            const verifyBody = (await verifyResponse.json().catch(() => ({}))) as {
              detail?: string;
              message?: string;
              error?: string;
            };
            if (!verifyResponse.ok) {
              reject(
                new Error(
                  verifyBody.detail ??
                    verifyBody.message ??
                    verifyBody.error ??
                    'Payment verification failed.',
                ),
              );
              return;
            }
            setBillingMessage('Payment successful. Your plan is now active.');
            await loadBilling();
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        modal: {
          ondismiss: () => resolve(),
        },
      });
      checkout.open();
    });
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-nx-accent">Settings</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold leading-tight text-nx-ink sm:text-3xl">
            Your Nexiora workspace
          </h1>
          <p className="mt-2 text-sm text-nx-muted">
            Manage your account, search experience, privacy, and plan.
          </p>
        </div>
        {saved ? <span className="text-sm font-medium text-nx-accent">Changes saved</span> : null}
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col"
          aria-label="Settings sections"
        >
          {SECTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSection(item)}
              className={`min-w-0 whitespace-nowrap rounded-xl px-3 py-2.5 text-center text-sm capitalize transition lg:w-full lg:px-4 lg:py-3 lg:text-left ${
                section === item
                  ? 'bg-nx-accent text-white'
                  : 'border border-nx-border bg-nx-elevated text-nx-muted hover:text-nx-ink'
              }`}
            >
              {item === 'billing' ? (
                <>
                  <span className="lg:hidden">Billing</span>
                  <span className="hidden lg:inline">Billing &amp; payments</span>
                </>
              ) : (
                item
              )}
            </button>
          ))}
        </nav>

        <main className="min-w-0 rounded-2xl border border-nx-border bg-nx-elevated p-4 sm:p-7">
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
              <div className="relative overflow-hidden rounded-2xl border border-nx-border bg-[linear-gradient(135deg,var(--nx-bg),var(--nx-accent-soft))] p-5 sm:p-6">
                <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full border border-nx-accent/15" />
                <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full border border-nx-accent/20" />
                <div className="relative flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-nx-accent/25 bg-nx-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-nx-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-nx-accent shadow-[0_0_8px_var(--nx-accent)]" />
                      {subscription?.accessGranted ? 'Plan active' : 'Activation required'}
                    </span>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-nx-muted">
                      Current workspace plan
                    </p>
                    <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
                      <h3 className="font-display text-3xl font-semibold capitalize text-nx-ink">
                        {subscription?.accessGranted ? subscription.planId : 'Free'}
                      </h3>
                      <span className="pb-1 text-sm capitalize text-nx-muted">
                        {subscription?.accessGranted ? subscription.status : 'Locked'}
                      </span>
                    </div>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-nx-muted">
                      {subscription?.accessGranted
                        ? 'Your workspace is active. Upgrade anytime when you need more searches and research capacity.'
                        : 'Activate Free access once for $2 to unlock Nova Search and your evidence workspace.'}
                    </p>
                  </div>
                  {!subscription?.accessGranted ? (
                    <Button
                      className="relative mt-1 h-11 px-5 shadow-[0_12px_30px_color-mix(in_srgb,var(--nx-accent)_22%,transparent)]"
                      disabled={billingBusy}
                      onClick={() => void startCheckout('free')}
                    >
                      Pay $2 &amp; activate
                    </Button>
                  ) : subscription.planId !== 'free' ? (
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

              <div className="mt-7">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-nx-ink">
                      Choose your capacity
                    </h3>
                    <p className="mt-1 text-sm text-nx-muted">
                      Clear USD pricing. Upgrade as your research grows.
                    </p>
                  </div>
                  <span className="rounded-full border border-nx-border px-3 py-1 text-xs text-nx-muted">
                    Secure checkout by Razorpay
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <PlanCard
                  name="Free"
                  price="$2 one-time"
                  description="Activate limited Free searches."
                  features={['Limited searches', 'Cited answers']}
                  current={subscription?.accessGranted && subscription.planId === 'free'}
                  onClick={() => void startCheckout('free')}
                  busy={billingBusy}
                />
                <PlanCard
                  name="Pro"
                  price="$20/month"
                  description="Higher limits and research tools."
                  features={['Research mode', 'Higher daily limits']}
                  recommended
                  current={subscription?.accessGranted && subscription.planId === 'pro'}
                  onClick={() => void startCheckout('pro')}
                  busy={billingBusy}
                />
                <PlanCard
                  name="Business"
                  price="$80/month"
                  description="Team-ready capacity and workspaces."
                  features={['Team capacity', 'Priority support']}
                  current={subscription?.accessGranted && subscription.planId === 'business'}
                  onClick={() => void startCheckout('business')}
                  busy={billingBusy}
                />
              </div>
              {billingMessage ? (
                <p className="mt-4 rounded-lg border border-nx-border p-3 text-sm text-nx-muted">
                  {billingMessage}
                </p>
              ) : null}

              <div className="mt-10 border-t border-nx-border pt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-nx-ink">
                      Billing history
                    </h3>
                    <p className="mt-1 text-sm text-nx-muted">
                      Open any payment to view its complete receipt.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="gap-2"
                    disabled={billingBusy}
                    onClick={() => void loadBilling()}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
                    </svg>
                    Refresh
                  </Button>
                </div>
                {invoices.length ? (
                  <ul className="mt-5 space-y-3">
                    {invoices.map((invoice) => (
                      <li key={invoice.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="group flex w-full items-center gap-4 rounded-xl border border-nx-border bg-nx-bg/45 p-4 text-left transition hover:-translate-y-0.5 hover:border-nx-accent/45 hover:bg-nx-accent-soft/20 hover:shadow-[0_14px_38px_color-mix(in_srgb,var(--nx-ink)_7%,transparent)]"
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-nx-border bg-nx-elevated text-nx-accent transition group-hover:border-nx-accent/30">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              className="h-5 w-5"
                              aria-hidden="true"
                            >
                              <path d="M6 3h9l3 3v15l-3-2-3 2-3-2-3 2V3Z" />
                              <path d="M9 8h6M9 12h6" />
                            </svg>
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-nx-ink">
                                {invoice.planId
                                  ? `${capitalize(invoice.planId)} plan payment`
                                  : (invoice.label ?? 'Nexiora payment')}
                              </p>
                              <span className="rounded-full bg-nx-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-nx-accent">
                                {invoice.status}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-nx-muted">
                              {formatBillDate(invoice.createdAt)} · Receipt{' '}
                              {shortId(invoice.number ?? invoice.id)}
                            </p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="font-display text-lg font-semibold text-nx-ink">
                              {formatMoney(invoice.amountPaid, invoice.currency)}
                            </p>
                            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-nx-accent opacity-70 transition group-hover:opacity-100">
                              View receipt
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              >
                                <path d="m9 18 6-6-6-6" />
                              </svg>
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-nx-border bg-nx-bg/30 px-5 py-10 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-nx-accent-soft text-nx-accent">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-6 w-6"
                        aria-hidden="true"
                      >
                        <path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3Z" />
                        <path d="M10 8h4M10 12h4" />
                      </svg>
                    </span>
                    <p className="mt-4 font-medium text-nx-ink">No receipts yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-nx-muted">
                      Your first successful payment will appear here with a complete downloadable
                      receipt.
                    </p>
                  </div>
                )}
              </div>

              {selectedInvoice ? (
                <InvoiceDialog
                  invoice={selectedInvoice}
                  customer={user}
                  onClose={() => setSelectedInvoice(null)}
                />
              ) : null}
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
  features,
  recommended = false,
  current = false,
  onClick,
  busy,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
  current?: boolean;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <div
      className={`group relative flex min-h-[252px] flex-col overflow-hidden rounded-2xl border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_color-mix(in_srgb,var(--nx-ink)_8%,transparent)] ${
        recommended
          ? 'border-nx-accent/45 bg-[linear-gradient(155deg,var(--nx-accent-soft),transparent_60%)]'
          : 'border-nx-border bg-nx-bg/35 hover:border-nx-accent/35'
      }`}
    >
      {recommended ? (
        <span className="absolute right-0 top-0 rounded-bl-xl bg-nx-accent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
          Most popular
        </span>
      ) : null}
      <div>
        <h3 className="font-display text-lg font-semibold text-nx-ink">{name}</h3>
        <p className="mt-2 font-display text-2xl font-semibold text-nx-ink">{price}</p>
      </div>
      <p className="mt-2 text-sm leading-5 text-nx-muted">{description}</p>
      <ul className="mt-4 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-xs text-nx-muted">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-nx-accent-soft text-nx-accent">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-2.5 w-2.5"
                aria-hidden="true"
              >
                <path d="m3 8 3 3 7-7" />
              </svg>
            </span>
            {feature}
          </li>
        ))}
      </ul>
      <Button
        className="mt-auto w-full"
        variant={recommended ? 'primary' : 'secondary'}
        disabled={busy || current}
        onClick={onClick}
      >
        {current ? 'Current plan' : `Choose ${name}`}
      </Button>
    </div>
  );
}

function InvoiceDialog({
  invoice,
  customer,
  onClose,
}: {
  invoice: Invoice;
  customer: SessionUser | null;
  onClose: () => void;
}) {
  const receiptNumber = invoice.number ?? invoice.paymentId ?? invoice.id;
  const billedEmail = invoice.email ?? customer?.email;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-title"
        className="invoice-print-area max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-nx-border bg-nx-elevated shadow-2xl sm:max-w-2xl sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-nx-border bg-nx-elevated/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-nx-accent font-display text-lg font-bold text-white shadow-[0_8px_20px_color-mix(in_srgb,var(--nx-accent)_25%,transparent)]">
              N
            </span>
            <div>
              <p className="font-display font-semibold text-nx-ink">Nexiora AI</p>
              <p className="text-[11px] text-nx-muted">Official payment receipt</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="grid h-9 w-9 place-items-center rounded-full border border-nx-border text-nx-muted transition hover:border-nx-accent/40 hover:bg-nx-accent-soft hover:text-nx-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-nx-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-nx-accent">
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3 w-3"
                  aria-hidden="true"
                >
                  <path d="m3 8 3 3 7-7" />
                </svg>
                Payment {invoice.status}
              </span>
              <h2
                id="invoice-title"
                className="mt-4 font-display text-2xl font-semibold text-nx-ink sm:text-3xl"
              >
                Thanks for your payment
              </h2>
              <p className="mt-2 text-sm text-nx-muted">{formatBillDate(invoice.createdAt)}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-nx-muted">Amount paid</p>
              <p className="mt-1 font-display text-3xl font-semibold text-nx-ink">
                {formatMoney(invoice.amountPaid, invoice.currency)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-nx-muted">
                {invoice.currency}
              </p>
            </div>
          </div>

          <div className="my-7 h-px bg-[linear-gradient(90deg,transparent,var(--nx-border),transparent)]" />

          <div className="grid gap-7 sm:grid-cols-2">
            <ReceiptGroup title="Receipt details">
              <ReceiptRow label="Receipt number" value={receiptNumber} mono />
              <ReceiptRow
                label="Plan"
                value={`${capitalize(invoice.planId ?? 'nexiora')} access`}
              />
              <ReceiptRow label="Payment method" value={capitalize(invoice.method ?? 'Online')} />
              <ReceiptRow label="Status" value={capitalize(invoice.status ?? 'Paid')} />
            </ReceiptGroup>
            <ReceiptGroup title="Billed to">
              <ReceiptRow label="Customer" value={customer?.displayName ?? 'Nexiora customer'} />
              {billedEmail ? <ReceiptRow label="Email" value={billedEmail} /> : null}
              {invoice.contact ? <ReceiptRow label="Contact" value={invoice.contact} /> : null}
            </ReceiptGroup>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-nx-border">
            <div className="flex items-center justify-between gap-4 border-b border-nx-border bg-nx-bg/50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-nx-muted sm:px-5">
              <span>Description</span>
              <span>Amount</span>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-5 sm:px-5">
              <div>
                <p className="font-medium text-nx-ink">
                  {capitalize(invoice.planId ?? 'Nexiora')} plan
                </p>
                <p className="mt-1 text-xs text-nx-muted">
                  {invoice.planId === 'free' ? 'One-time activation' : 'Subscription payment'}
                </p>
              </div>
              <p className="font-semibold text-nx-ink">
                {formatMoney(invoice.amountPaid, invoice.currency)}
              </p>
            </div>
            {invoice.amountRefunded ? (
              <div className="flex items-center justify-between border-t border-nx-border px-4 py-3 text-sm sm:px-5">
                <span className="text-nx-muted">Refunded</span>
                <span className="text-nx-ink">
                  −{formatMoney(invoice.amountRefunded, invoice.currency)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-nx-border bg-nx-accent-soft/30 px-4 py-4 sm:px-5">
              <span className="font-semibold text-nx-ink">Total paid</span>
              <span className="font-display text-xl font-semibold text-nx-ink">
                {formatMoney(invoice.amountPaid, invoice.currency)}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-nx-border bg-nx-bg/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-nx-muted">
              Transaction reference
            </p>
            <p className="mt-2 break-all font-mono text-xs text-nx-ink">
              {invoice.paymentId ?? invoice.id}
            </p>
            {invoice.orderId ? (
              <p className="mt-1 break-all font-mono text-[11px] text-nx-muted">
                Order: {invoice.orderId}
              </p>
            ) : null}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-sm text-xs leading-5 text-nx-muted">
              This receipt confirms a successful payment to Nexiora AI. Keep it for your records.
            </p>
            <div className="flex gap-2">
              {invoice.pdfUrl ? (
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-nx border border-nx-border bg-nx-bg-elevated px-4 py-2 text-sm font-medium text-nx-ink transition hover:bg-nx-accent-soft"
                >
                  Download PDF
                </a>
              ) : null}
              {invoice.hostedUrl ? (
                <a
                  href={invoice.hostedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-nx bg-nx-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Provider receipt
                </a>
              ) : null}
              <Button variant="secondary" onClick={() => window.print()}>
                Print receipt
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReceiptGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-nx-muted">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ReceiptRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-nx-muted">{label}</p>
      <p className={`${mono ? 'break-all font-mono text-xs' : 'text-sm'} mt-0.5 text-nx-ink`}>
        {value}
      </p>
    </div>
  );
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
  }
}

function formatBillDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function shortId(value: string): string {
  return value.length > 14 ? `…${value.slice(-10)}` : value;
}

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string; name?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay.')), {
        once: true,
      });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay.'));
    document.body.appendChild(script);
  });
}
