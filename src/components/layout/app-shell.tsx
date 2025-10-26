'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { DesktopNavigation, MobileNavigation } from './navigation';
import { UserMenu } from './user-menu';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { isPublicAuthRoute } from '@/config/auth';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, initializing, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute = isPublicAuthRoute(pathname);

  useEffect(() => {
    if (initializing || isAuthRoute || user) {
      return;
    }

    const destination =
      typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : pathname;
    const isSafeDestination = destination.startsWith('/') && !isPublicAuthRoute(destination);
    const redirectQuery = isSafeDestination && destination !== '/' ? `?from=${encodeURIComponent(destination)}` : '';

    router.replace(`/sign-in${redirectQuery}`);
  }, [initializing, isAuthRoute, pathname, router, user]);

  useEffect(() => {
    if (initializing || !isAuthRoute || !user) {
      return;
    }

    let destination = '/';

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const from = params.get('from');

      if (from && from.startsWith('/') && !isPublicAuthRoute(from)) {
        destination = from;
      }
    }

    router.replace(destination);
  }, [initializing, isAuthRoute, router, user]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!isAuthRoute && (
        <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
              ProText Coach
            </Link>
            <div className="hidden flex-1 justify-center md:flex">{user ? <DesktopNavigation /> : null}</div>
            <div className="flex items-center gap-3">
              {initializing ? (
                <div className="h-10 w-10 animate-pulse rounded-full border border-border bg-muted/60" />
              ) : user ? (
                <UserMenu user={user} onSignOut={signOut} />
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" asChild>
                    <Link href="/sign-in">Sign in</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/sign-up">Get started</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      <div className="flex flex-1 justify-center">
        <main
          className={cn(
            'w-full',
            isAuthRoute
              ? 'max-w-md px-4 pb-16 pt-10 sm:px-6'
              : 'max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8',
          )}
        >
          {children}
        </main>
      </div>
      {!isAuthRoute && user ? <MobileNavigation /> : null}
    </div>
  );
}
