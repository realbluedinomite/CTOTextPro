export const AUTH_PUBLIC_ROUTES = ['/sign-in', '/sign-up'] as const;

export type OAuthProviderName = 'google' | 'github';

export function isPublicAuthRoute(path: string) {
  const [pathname] = path.split('?');
  return AUTH_PUBLIC_ROUTES.includes(pathname as (typeof AUTH_PUBLIC_ROUTES)[number]);
}

export function getSafeRedirectPath(redirectPath?: string | null) {
  if (!redirectPath) {
    return '/';
  }

  if (!redirectPath.startsWith('/')) {
    return '/';
  }

  return isPublicAuthRoute(redirectPath) ? '/' : redirectPath;
}
