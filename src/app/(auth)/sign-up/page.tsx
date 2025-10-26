import Link from 'next/link';

import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { isPublicAuthRoute } from '@/config/auth';

type SignUpPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  const fromParam = searchParams?.from;
  const redirectTo = typeof fromParam === 'string' && !isPublicAuthRoute(fromParam) ? fromParam : undefined;

  return (
    <AuthPageShell
      title="Create an account"
      description="Join ProText Coach to unlock practice plans and progress analytics."
      footer={
        <p>
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-primary hover:text-primary/80">
            Sign in
          </Link>
        </p>
      }
    >
      <SignUpForm redirectTo={redirectTo} />
    </AuthPageShell>
  );
}
