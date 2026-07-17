import Link from 'next/link';
import { Button } from '@nexiora/ui';
import { pricingCopy } from '@/content/site';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nexiora AI pricing | Free, Pro, and Business for Nova Search',
  description: pricingCopy.description,
  path: '/pricing',
});

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-4xl font-semibold text-nx-ink">{pricingCopy.title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-nx-muted">{pricingCopy.intro}</p>
      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {pricingCopy.plans.map((plan) => (
          <li
            key={plan.id}
            className={`rounded-nx border p-6 ${
              'highlighted' in plan && plan.highlighted
                ? 'border-nx-accent bg-nx-accent-soft/40'
                : 'border-nx-border bg-nx-elevated'
            }`}
          >
            <h2 className="font-display text-xl font-medium text-nx-ink">{plan.name}</h2>
            <p className="mt-2 font-display text-3xl text-nx-ink">
              {plan.price}
              <span className="text-base font-normal text-nx-muted">/{plan.period}</span>
            </p>
            <p className="mt-3 text-sm text-nx-muted">{plan.blurb}</p>
            <ul className="mt-6 space-y-2">
              {plan.points.map((point) => (
                <li key={point} className="text-sm text-nx-ink">
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href={plan.id === 'free' ? '/settings/subscription' : '/settings/subscription'}>
                <Button variant={plan.id === 'pro' ? 'primary' : 'secondary'} className="w-full">
                  {plan.id === 'free' ? 'Activate Free · $2' : `Choose ${plan.name}`}
                </Button>
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-10 max-w-3xl text-sm text-nx-muted">{pricingCopy.footnote}</p>
    </div>
  );
}
