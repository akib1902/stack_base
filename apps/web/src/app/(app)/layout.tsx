import { redirect } from 'next/navigation';
import type { MeResponse, VaultResponse } from '@stackbase/contracts';
import { AppShell } from '@/components/layout/AppShell';
import { VaultProvider } from '@/features/encryption/vault-context';
import { OfflineProvider } from '@/features/offline/offline-context';
import { UploadPanel } from '@/features/uploads/upload-panel';
import { UploadProvider } from '@/features/uploads/upload-context';
import { UnauthenticatedError, apiFetch } from '@/lib/api/client';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let me: MeResponse;
  let vault: VaultResponse;

  try {
    [me, vault] = await Promise.all([
      apiFetch<MeResponse>('/api/v1/me'),
      apiFetch<VaultResponse>('/api/v1/encryption/vault'),
    ]);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    // Infrastructure failures bubble to the error boundary, which offers a retry.
    throw error;
  }

  return (
    // The vault record is public metadata (salt, parameters, wrapped key); the
    // key itself is derived and kept in the browser by these providers only.
    <VaultProvider record={vault.vault}>
      <OfflineProvider user={me.user} offlineEnabled={me.settings.offlineEnabled}>
        <UploadProvider>
          <AppShell user={me.user}>{children}</AppShell>
          <UploadPanel />
        </UploadProvider>
      </OfflineProvider>
    </VaultProvider>
  );
}
