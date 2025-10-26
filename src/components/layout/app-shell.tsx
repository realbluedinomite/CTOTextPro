import Link from 'next/link';
import type { ReactNode } from 'react';

import { DesktopNavigation, MobileNavigation } from './navigation';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
            ProText Coach
          </Link>
          <div className="hidden flex-1 justify-center md:flex">
            <DesktopNavigation />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Alex Johnson</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-foreground shadow-sm">
              <span>AJ</span>
            </div>
          </div>
        </div>
      </header>
      <div className="flex flex-1 justify-center">
        <main className="w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <MobileNavigation />
    </div>
  );
}
