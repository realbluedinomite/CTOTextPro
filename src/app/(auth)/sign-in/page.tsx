import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignInPage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Sign in</h1>
        <p className="text-muted-foreground">Access your personalized practice sessions and progress.</p>
      </div>
      <form className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email
          </label>
          <Input id="email" placeholder="you@example.com" type="email" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <Link href="#" className="text-sm font-medium text-primary hover:text-primary/80">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="font-medium text-primary hover:text-primary/80">
          Create one
        </Link>
      </p>
    </div>
  );
}
