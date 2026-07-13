/**
 * Central marketing copy for Nexiora AI / Nova Search.
 * Written for search engines and readers — concrete claims, no filler slogans.
 */
export const siteConfig = {
  name: 'Nexiora AI',
  product: 'Nova Search',
  url: process.env.NEXT_PUBLIC_WEB_URL || process.env.PUBLIC_WEB_URL || 'http://localhost:3000',
  locale: 'en_US',
  twitter: '@nexioraai',
  supportEmail: 'hello@nexiora.ai',
} as const;

export const defaultSeo = {
  title: 'Nexiora AI | Nova Search — AI search with citations you can verify',
  description:
    'Nova Search by Nexiora AI answers questions with ranked sources, confidence scores, and publication dates. Built for researchers, analysts, and teams who need evidence—not guesswork.',
  keywords: [
    'AI search engine',
    'cited AI answers',
    'research search tool',
    'Nova Search',
    'Nexiora AI',
    'source-backed search',
    'academic search AI',
    'fact checked search',
  ],
} as const;

export const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/research', label: 'Research' },
  { href: '/pricing', label: 'Pricing' },
] as const;

/** Product app destinations (sidebar) — kept separate from marketing nav. */
export const appNavLinks = [
  { href: '/dashboard', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/news', label: 'News' },
  { href: '/library', label: 'Library' },
  { href: '/settings', label: 'Settings' },
] as const;

export const footerColumns = [
  {
    title: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/search', label: 'Try Nova Search' },
      { href: '/pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Use cases',
    links: [
      { href: '/research', label: 'Academic research' },
      { href: '/news', label: 'Live news' },
      { href: '/dashboard', label: 'Product home' },
      { href: '/features#analysts', label: 'Analysts' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: `mailto:${siteConfig.supportEmail}`, label: 'Contact' },
    ],
  },
] as const;

export const homeCopy = {
  brandEyebrow: 'Nexiora AI',
  h1: 'Nova Search',
  lead:
    'Ask a question. Get an answer with sources ranked by trust, freshness, and relevance—so you can check the claim before you act on it.',
  primaryCta: 'Start free search',
  secondaryCta: 'See pricing',
  sections: {
    problem: {
      h2: 'Most AI answers stop where the work begins',
      body: 'Chat tools often invent details or bury the few links they used. Classic search dumps ten blue links and leaves synthesis to you. Nova Search sits in the middle: it retrieves from multiple sources, removes near-duplicates, ranks official and high-trust domains higher, then writes an answer you can audit citation by citation.',
    },
    how: {
      h2: 'What happens when you search',
      steps: [
        {
          title: 'Intent and filters',
          body: 'Nova classifies whether you need news, research, comparison, or a plain definition, then applies the filters you set (date, language, source type).',
        },
        {
          title: 'Multi-source retrieval',
          body: 'Live adapters pull encyclopedic, academic, and discussion sources in parallel. Failed providers do not block the rest.',
        },
        {
          title: 'Rank, cite, answer',
          body: 'Documents are deduplicated and scored for relevance, trust, and age. The answer stream includes confidence and a citation rail you can open in one click.',
        },
      ],
    },
    audiences: {
      h2: 'Who uses Nexiora',
      items: [
        {
          title: 'Researchers and students',
          body: 'Start from papers and reference pages, then export a trail of sources instead of a single opaque paragraph.',
        },
        {
          title: 'Analysts and operators',
          body: 'Track a topic with freshness bias, keep bookmarks, and revisit prior searches without losing context.',
        },
        {
          title: 'Writers and editors',
          body: 'Use related questions and stronger query suggestions to brief a piece without hopping across five tabs.',
        },
      ],
    },
    faq: {
      h2: 'Common questions',
      items: [
        {
          q: 'Is Nova Search a Google replacement?',
          a: 'No. Navigational lookups (“login page for X”) still belong in a general search engine. Nova Search is for questions where you need a sourced explanation.',
        },
        {
          q: 'Can answers be wrong?',
          a: 'Yes—any retrieval system can miss context. That is why citations, trust scores, and timestamps are visible. Treat critical decisions as requiring primary-source review.',
        },
        {
          q: 'Do I need an API key to try it?',
          a: 'No. Anonymous visitors get a limited daily quota. Sign in for higher limits, history, and bookmarks.',
        },
      ],
    },
  },
} as const;

export const featuresCopy = {
  title: 'Nova Search features',
  description:
    'Explore citation-first AI search, research mode, news retrieval, filters, and library tools in Nexiora AI.',
  intro:
    'Nexiora ships Nova Search as a knowledge workflow—not a novelty chat box. Below is what is available in the product today and how each piece helps you verify information faster.',
  groups: [
    {
      id: 'search',
      h2: 'Universal search',
      body: 'Natural-language queries with streaming summaries, detailed answers, related questions, and a persistent citation rail.',
    },
    {
      id: 'trust',
      h2: 'Trust and ranking',
      body: 'Official domains and higher base-trust sources rise in the ranking. Confidence is shown beside every completed answer.',
    },
    {
      id: 'research',
      h2: 'Research mode',
      body: 'Bias retrieval toward academic and documentation sources when you need papers, definitions, or methodology context.',
    },
    {
      id: 'news',
      h2: 'News awareness',
      body: 'Follow live and category news feeds, then open any story into a full Nova Search pass for synthesis with citations.',
    },
    {
      id: 'creators',
      h2: 'For content teams',
      body: 'Related questions and reformulated queries help outline articles and briefs without discarding source discipline.',
    },
    {
      id: 'analysts',
      h2: 'For analysts',
      body: 'History, bookmarks, and plan-based quotas keep recurring topics organized as your team scales usage.',
    },
  ],
} as const;

export const pricingCopy = {
  title: 'Pricing',
  description:
    'Simple Nexiora AI plans for Nova Search: Free for evaluation, Pro for daily research, Business for teams.',
  intro:
    'Usage is metered by daily searches and features. Start free, upgrade when quotas or modes become part of your weekly workflow.',
  plans: [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      blurb: 'Evaluate Nova Search on real queries.',
      points: ['Limited daily searches', 'Universal mode', 'Citations and confidence', 'No card required'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$20',
      period: 'per month',
      blurb: 'For people who search as part of the job.',
      points: ['Higher daily limits', 'Research mode', 'History and bookmarks', 'API access (metered)'],
      highlighted: true,
    },
    {
      id: 'business',
      name: 'Business',
      price: '$80',
      period: 'per month',
      blurb: 'Shared work when a team depends on the same sources.',
      points: ['Team workspaces', 'Shared collections', 'Higher API ceiling', 'Priority support path'],
    },
  ],
  footnote:
    'Enterprise SSO, audit exports, and dedicated limits are scoped per contract. Stripe checkout activates when billing keys are configured in your environment.',
} as const;

export const aboutCopy = {
  title: 'About Nexiora AI',
  description: 'Nexiora AI builds Nova Search, an AI knowledge platform focused on cited, checkable answers.',
  body: [
    'Nexiora AI started from a practical frustration: generative tools sound fluent while hiding weak evidence, and web search still expects every reader to be their own research assistant.',
    'Nova Search is our answer. The product retrieves from multiple live sources, ranks for trust and freshness, and refuses to present an answer without a trail you can inspect.',
    'We build for people who ship decisions—researchers, analysts, editors, and operators—not for demo screenshots. Accuracy beats theatrics. When sources disagree, the UI should show that tension instead of smoothing it away.',
  ],
} as const;
