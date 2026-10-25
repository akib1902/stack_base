import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md rounded-card border border-border bg-surface p-6">
        <span className="inline-grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Compass className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">This page does not exist</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          The destination may belong to a milestone that has not shipped yet.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Back to the dashboard
        </Link>
      </div>
    </main>
  );
}
