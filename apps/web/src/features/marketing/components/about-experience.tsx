'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@nexiora/ui';
import { aboutCopy } from '@/content/site';

export function AboutExperience() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-about-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-visible', 'true');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const movingSignals = [...aboutCopy.signals, ...aboutCopy.signals];

  return (
    <div className="overflow-hidden">
      <section className="relative mx-auto flex min-h-[78vh] max-w-7xl items-center px-4 py-20 sm:px-8">
        <div className="about-orbit about-orbit-one" aria-hidden="true" />
        <div className="about-orbit about-orbit-two" aria-hidden="true" />
        <div className="relative z-10 max-w-4xl">
          <p className="about-hero-in text-xs font-semibold uppercase tracking-[0.24em] text-nx-accent">
            {aboutCopy.eyebrow}
          </p>
          <h1 className="about-hero-in about-delay-1 mt-5 font-display text-5xl font-semibold leading-[0.98] tracking-tight text-nx-ink sm:text-7xl lg:text-8xl">
            Search should show
            <span className="block text-nx-accent">its working.</span>
          </h1>
          <p className="about-hero-in about-delay-2 mt-7 max-w-2xl text-lg leading-8 text-nx-muted">
            {aboutCopy.lead}
          </p>
          <div className="about-hero-in about-delay-3 mt-9 flex flex-wrap gap-3">
            <Link href="/search">
              <Button>Start searching</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="secondary">Explore plans</Button>
            </Link>
          </div>
        </div>

        <div
          className="about-floating-card right-[6%] top-[22%] hidden lg:block"
          aria-hidden="true"
        >
          <span className="text-xs text-nx-accent">SOURCE 04</span>
          <p className="mt-2 text-sm font-medium text-nx-ink">Evidence attached</p>
          <div className="mt-3 h-1.5 w-32 overflow-hidden rounded-full bg-nx-border">
            <div className="about-score h-full w-[88%] bg-nx-accent" />
          </div>
        </div>
        <div
          className="about-floating-card bottom-[18%] right-[18%] hidden lg:block"
          aria-hidden="true"
        >
          <span className="text-xs text-nx-muted">CONFIDENCE</span>
          <p className="mt-1 font-display text-3xl text-nx-ink">92%</p>
        </div>
      </section>

      <div className="border-y border-nx-border bg-nx-elevated/60 py-4" aria-hidden="true">
        <div className="about-marquee flex w-max gap-12">
          {movingSignals.map((signal, index) => (
            <span
              key={`${signal}-${index}`}
              className="flex items-center gap-12 text-sm font-semibold uppercase tracking-[0.18em] text-nx-muted"
            >
              {signal}
              <i className="h-1.5 w-1.5 rounded-full bg-nx-accent" />
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-28 sm:px-8">
        <div data-about-reveal className="about-reveal grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nx-accent">
            Why we exist
          </p>
          <div className="space-y-6">
            {aboutCopy.body.map((paragraph) => (
              <p
                key={paragraph.slice(0, 32)}
                className="font-display text-2xl leading-relaxed text-nx-ink sm:text-3xl"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-nx-border bg-nx-elevated/35">
        <div className="mx-auto max-w-6xl px-4 py-28 sm:px-8">
          <div data-about-reveal className="about-reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nx-accent">
              Our principles
            </p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold text-nx-ink sm:text-5xl">
              Premium research starts with honest product choices.
            </h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {aboutCopy.principles.map((principle, index) => (
              <article
                key={principle.number}
                data-about-reveal
                className="about-reveal group rounded-2xl border border-nx-border bg-nx-bg/60 p-6 transition duration-300 hover:-translate-y-1 hover:border-nx-accent/60"
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <span className="font-mono text-xs text-nx-accent">{principle.number}</span>
                <h3 className="mt-12 font-display text-2xl font-semibold text-nx-ink">
                  {principle.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-nx-muted">{principle.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-32 text-center sm:px-8">
        <div
          data-about-reveal
          className="about-reveal relative overflow-hidden rounded-3xl border border-nx-accent/30 bg-nx-elevated px-6 py-20"
        >
          <div className="absolute inset-0 nx-atmosphere opacity-40" aria-hidden="true" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nx-accent">
              The next question
            </p>
            <h2 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-semibold text-nx-ink sm:text-6xl">
              Ask boldly. Verify everything.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-nx-muted">
              Nova brings the answer and its evidence into one focused research surface.
            </p>
            <Link href="/search" className="mt-8 inline-block">
              <Button>Try Nova Search</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
