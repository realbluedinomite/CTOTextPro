'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { OAuthProviderName } from '@/config/auth';
import { getSafeRedirectPath } from '@/config/auth';
import { getAuthErrorMessage } from '@/lib/auth-errors';

import { SocialAuthButtons } from './social-auth-buttons';

const signInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

export function SignInForm({ redirectTo }: { redirectTo?: string | null }) {
  const router = useRouter();
  const { signInWithEmail, signInWithProvider, sendPasswordReset } = useAuth();
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSocialAuthenticating, setIsSocialAuthenticating] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    clearErrors,
    getValues,
  } = form;

  const safeRedirect = getSafeRedirectPath(redirectTo);

  const onSubmit = handleSubmit(async (values) => {
    setStatusMessage(null);
    clearErrors('root');

    try {
      await signInWithEmail(values.email, values.password);
      router.replace(safeRedirect);
    } catch (error) {
      const message = getAuthErrorMessage(error, 'Unable to sign in. Please try again.');
      setError('root', { type: 'manual', message });
    }
  });

  const handleProviderSignIn = async (provider: OAuthProviderName) => {
    setStatusMessage(null);
    clearErrors();
    setIsSocialAuthenticating(true);

    try {
      await signInWithProvider(provider);
      router.replace(safeRedirect);
    } catch (error) {
      const message = getAuthErrorMessage(error, 'Unable to sign in with that provider.');
      setError('root', { type: 'manual', message });
    } finally {
      setIsSocialAuthenticating(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = resetEmail.trim() || getValues('email');

    if (!email) {
      setStatusMessage({ type: 'error', text: 'Enter your email address to receive a reset link.' });
      return;
    }

    setIsSendingReset(true);
    setStatusMessage(null);

    try {
      await sendPasswordReset(email);
      setStatusMessage({ type: 'success', text: 'Password reset link sent. Check your inbox.' });
      setShowReset(false);
    } catch (error) {
      const message = getAuthErrorMessage(error, 'We could not send a reset email. Try again shortly.');
      setStatusMessage({ type: 'error', text: message });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="space-y-5">
      {errors.root?.message ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </div>
      ) : null}
      {statusMessage ? (
        <div
          className={
            statusMessage.type === 'success'
              ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'
              : 'rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
          }
        >
          {statusMessage.text}
        </div>
      ) : null}
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email', {
              onChange: (event) => {
                if (showReset) {
                  setResetEmail(event.target.value);
                }
              },
            })}
          />
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              onClick={() => {
                setShowReset((prev) => !prev);
                setResetEmail(getValues('email'));
              }}
            >
              {showReset ? 'Cancel reset' : 'Forgot password?'}
            </button>
          </div>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
        </div>
        {showReset ? (
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">
              Enter the email address associated with your account and we&apos;ll send you a password reset link.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
              <Button type="button" onClick={() => void handlePasswordReset()} disabled={isSendingReset}>
                {isSendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </div>
        ) : null}
        <Button type="submit" className="w-full" disabled={isSubmitting || isSocialAuthenticating}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue
        </Button>
      </form>
      <div className="relative py-2">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden="true" />
        <span className="relative block text-center text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Or continue with
        </span>
      </div>
      <SocialAuthButtons
        onAuthenticate={handleProviderSignIn}
        disabled={isSubmitting || isSocialAuthenticating || isSendingReset}
      />
    </div>
  );
}
