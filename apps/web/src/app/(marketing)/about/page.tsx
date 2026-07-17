import { aboutCopy } from '@/content/site';
import { AboutExperience } from '@/features/marketing/components/about-experience';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'About Nexiora AI | builders of Nova Search',
  description: aboutCopy.description,
  path: '/about',
});

export default function AboutPage() {
  return <AboutExperience />;
}
