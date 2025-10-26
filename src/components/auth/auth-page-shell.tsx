import type { ReactNode } from 'react';

export function AuthPageShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-5 rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm backdrop-blur">
        {children}
      </div>
      {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
