import { redirect } from 'next/navigation';
import type { MeResponse } from '@stackbase/contracts';
import { AppShell } from '@/components/layout/AppShell';
import { UnauthenticatedError, apiFetch } from '@/lib/api/client';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let me: MeResponse;

  try {
    me = await apiFetch<MeResponse>('/api/v1/me');
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    // Infrastructure failures bubble to the error boundary, which offers a retry.
    throw error;
  }

  return <AppShell user={me.user}>{children}</AppShell>;
}
