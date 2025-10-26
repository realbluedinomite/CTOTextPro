import Link from 'next/link';

import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { SignInForm } from '@/components/auth/sign-in-form';
import { isPublicAuthRoute } from '@/config/auth';

type SignInPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  const fromParam = searchParams?.from;
  const redirectTo = typeof fromParam === 'string' && !isPublicAuthRoute(fromParam) ? fromParam : undefined;

  return (
    <AuthPageShell
      title="Sign in"
      description="Access your personalized practice sessions and progress."
      footer={
        <p>
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="font-medium text-primary hover:text-primary/80">
            Create one
          </Link>
        </p>
      }
    >
      <SignInForm redirectTo={redirectTo} />
    </AuthPageShell>
  );
}
