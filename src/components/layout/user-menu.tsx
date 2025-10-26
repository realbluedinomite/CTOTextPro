'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { LogOut, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';

type UserMenuProps = {
  user: User;
  onSignOut: () => Promise<void>;
};

const getUserInitials = (user: User) => {
  const source = user.displayName ?? user.email ?? 'User';
  const [first = '', second = ''] = source.split(' ');

  if (second) {
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
};

const getUserLabel = (user: User) => user.displayName ?? user.email ?? 'Account';

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [closeMenu, open]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setError(null);

    try {
      await onSignOut();
      closeMenu();
    } catch (err) {
      setError('Unable to sign out. Please try again.');
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/80"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{getUserInitials(user)}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-border/80 bg-card text-sm shadow-xl">
          <div className="space-y-0.5 px-4 py-3">
            <p className="font-medium text-foreground">{getUserLabel(user)}</p>
            {user.email ? <p className="text-xs text-muted-foreground">{user.email}</p> : null}
          </div>
          <div className="border-t border-border/70" />
          <div className="flex flex-col gap-1 p-2">
            <Link
              href="/settings"
              onClick={closeMenu}
              className="flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Settings
            </Link>
            <Button
              type="button"
              variant="ghost"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center justify-start gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </Button>
            {error ? <p className="px-3 text-xs text-destructive">{error}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
