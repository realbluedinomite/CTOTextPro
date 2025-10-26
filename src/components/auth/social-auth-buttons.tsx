'use client';

import { useState } from 'react';
import { Github, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { OAuthProviderName } from '@/config/auth';

type SocialAuthButtonsProps = {
  onAuthenticate: (provider: OAuthProviderName) => Promise<void>;
  disabled?: boolean;
};

const GoogleGlyph = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M23.52 12.272c0-.851-.076-1.67-.218-2.455H12v4.64h6.46a5.51 5.51 0 0 1-2.392 3.62l-.022.146 3.477 2.694.241.024c2.215-2.044 3.756-5.055 3.756-8.669"
      fill="#4285F4"
    />
    <path
      d="M12 24c3.24 0 5.957-1.067 7.943-2.899l-3.787-2.933c-1.024.704-2.335 1.13-3.955 1.13-3.037 0-5.607-2.051-6.522-4.82l-.135.011-3.705 2.86-.048.128C3.766 21.769 7.583 24 12 24"
      fill="#34A853"
    />
    <path
      d="M5.478 14.478A7.21 7.21 0 0 1 5.08 12c0-.862.155-1.697.375-2.478l-.006-.166-3.747-2.904-.123.058A11.97 11.97 0 0 0 0 12c0 1.977.474 3.845 1.305 5.49z"
      fill="#FBBC05"
    />
    <path
      d="M12 4.741a6.5 6.5 0 0 1 4.596 1.797l3.355-3.247C17.944 1.261 15.24 0 12 0 7.583 0 3.766 2.231 1.305 6.51l4.15 3.237C6.39 6.93 8.96 4.741 12 4.741"
      fill="#EA4335"
    />
  </svg>
);

export function SocialAuthButtons({ onAuthenticate, disabled }: SocialAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<OAuthProviderName | null>(null);

  const handleClick = async (provider: OAuthProviderName) => {
    if (disabled || pendingProvider) {
      return;
    }

    setPendingProvider(provider);
    try {
      await onAuthenticate(provider);
    } finally {
      setPendingProvider(null);
    }
  };

  const isPending = (provider: OAuthProviderName) => pendingProvider === provider;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={disabled || isPending('google')}
        onClick={() => void handleClick('google')}
      >
        {isPending('google') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleGlyph />}
        <span className="ml-2">Google</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={disabled || isPending('github')}
        onClick={() => void handleClick('github')}
      >
        {isPending('github') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
        <span className="ml-2">GitHub</span>
      </Button>
    </div>
  );
}
