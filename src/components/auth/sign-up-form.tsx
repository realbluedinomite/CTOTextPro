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

const signUpSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignUpForm({ redirectTo }: { redirectTo?: string | null }) {
  const router = useRouter();
  const { signUpWithEmail, signInWithProvider } = useAuth();
  const [isSocialAuthenticating, setIsSocialAuthenticating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const safeRedirect = getSafeRedirectPath(redirectTo);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors('root');

    try {
      await signUpWithEmail(values.name, values.email, values.password);
      router.replace(safeRedirect);
    } catch (error) {
      const message = getAuthErrorMessage(error, 'Unable to create your account. Please try again.');
      setError('root', { type: 'manual', message });
    }
  });

  const handleProviderSignIn = async (provider: OAuthProviderName) => {
    clearErrors('root');
    setIsSocialAuthenticating(true);

    try {
      await signInWithProvider(provider);
      router.replace(safeRedirect);
    } catch (error) {
      const message = getAuthErrorMessage(error, 'Unable to continue with that provider.');
      setError('root', { type: 'manual', message });
    } finally {
      setIsSocialAuthenticating(false);
    }
  };

  return (
    <div className="space-y-5">
      {errors.root?.message ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </div>
      ) : null}
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="name">
            Full name
          </label>
          <Input id="name" autoComplete="name" placeholder="Alex Johnson" {...register('name')} />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Work email
          </label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} />
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Password
          </label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || isSocialAuthenticating}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create account
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
        disabled={isSubmitting || isSocialAuthenticating}
      />
    </div>
  );
}
