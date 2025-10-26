import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';

import { AppShell } from '@/components/layout/app-shell';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { cn } from '@/lib/utils';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://protext.coach'),
  title: {
    default: 'ProText Coach',
    template: '%s | ProText Coach',
  },
  description: 'ProText Coach delivers guided writing practice, actionable feedback, and progress tracking tailored for engineering leaders.',
  keywords: [
    'ProText Coach',
    'writing coach',
    'engineering management',
    'practice drills',
    'progress tracking',
  ],
  authors: [{ name: 'ProText Coach' }],
  openGraph: {
    title: 'ProText Coach',
    description:
      'Develop stronger communication through guided practice sessions, analytics, and coaching insights designed for engineering leaders.',
    url: 'https://protext.coach',
    siteName: 'ProText Coach',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProText Coach',
    description:
      'Guided writing practice with analytics and coaching for engineering leaders.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans text-foreground antialiased', inter.variable)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
