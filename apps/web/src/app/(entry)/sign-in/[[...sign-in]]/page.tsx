import { AuthExperience } from '@/features/auth/components/auth-experience';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Log in | Nexiora AI',
  description: 'Sign in to your Nexiora evidence workspace.',
  path: '/sign-in',
  noIndex: true,
});

type SignInPageProps = {
  searchParams: Promise<{ next?: string; reset?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  return (
    <AuthExperience
      mode="sign-in"
      googleEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
      nextPath={params.next}
      passwordResetSuccess={params.reset === '1'}
    />
  );
}
