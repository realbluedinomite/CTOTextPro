import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-12 shadow-sm sm:px-10">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Welcome back</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Coach your writing practice with guided prompts and meaningful feedback.
          </h1>
          <p className="text-lg text-muted-foreground">
            ProText Coach helps engineering leaders build stronger communication habits through deliberate
            practice, structured reflections, and insight-driven analytics.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/practice">Start a practice session</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/progress">Review recent progress</Link>
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Quick prompt</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Drop a topic and we&apos;ll craft a practice scenario tuned for engineering leaders.
          </p>
          <form className="mt-4 space-y-3" action="/practice">
            <Input placeholder="Pitch a new initiative to your CTO" name="prompt" />
            <Button type="submit" className="w-full">
              Generate prompt
            </Button>
          </form>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Evaluation rubrics</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Align expectations with customizable rubrics covering clarity, influence, and technical accuracy.
          </p>
          <Button asChild className="mt-4 w-full" variant="outline">
            <Link href="/settings">Manage rubrics</Link>
          </Button>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Progress snapshots</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Compare the strength of your writing over time with AI-generated insights and peer feedback.
          </p>
          <Button asChild className="mt-4 w-full" variant="outline">
            <Link href="/progress">Open dashboard</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
