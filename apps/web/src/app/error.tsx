'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/feedback/ErrorState';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <ErrorState
        title="Something went wrong"
        description="The StackBase API may be unreachable or the metadata database may be starting. Start it with pnpm dev:api, then retry."
        onRetry={reset}
      />
    </main>
  );
}
