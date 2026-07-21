import { AuthExperience } from '@/features/auth/components/auth-experience';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nexiora AI | Search with evidence',
  description: 'Log in or create a Nexiora account to search with ranked, checkable sources.',
  path: '/',
});

type EntryPageProps = {
  searchParams: Promise<{ mode?: string; next?: string }>;
};

export default async function EntryPage({ searchParams }: EntryPageProps) {
  const params = await searchParams;
  return (
    <AuthExperience
      mode={params.mode === 'sign-up' ? 'sign-up' : 'sign-in'}
      googleEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
      nextPath={params.next}
    />
  );
}
