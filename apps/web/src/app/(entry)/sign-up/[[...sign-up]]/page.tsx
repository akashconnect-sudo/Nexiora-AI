import { AuthExperience } from '@/features/auth/components/auth-experience';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Create account | Nexiora AI',
  description: 'Create a Nexiora account and start searching with evidence.',
  path: '/sign-up',
  noIndex: true,
});

type SignUpPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  return (
    <AuthExperience
      mode="sign-up"
      googleEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
      nextPath={params.next}
    />
  );
}
