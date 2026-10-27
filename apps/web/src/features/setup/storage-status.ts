import type { SetupStatusResponse } from '@stackbase/contracts';

export type StatusVariant = 'success' | 'muted' | 'warning' | 'danger';

export interface StorageStatusSummary {
  variant: StatusVariant;
  label: string;
  detail: string;
}

/**
 * Single source of truth for how connection state is described, shared by the
 * dashboard and settings so both always tell the same story. The two providers
 * are described differently on purpose: `local` keeps ciphertext on the API
 * host and is only ever valid outside production (ADR-015).
 */
export function describeStorage(storage: SetupStatusResponse['storage']): StorageStatusSummary {
  const local = storage.provider === 'local';

  switch (storage.status) {
    case 'connected':
      return local
        ? {
            variant: 'warning',
            label: 'Development storage',
            detail:
              'Ciphertext is written to the development filesystem provider on the API host. Set TELEGRAM_API_ID and TELEGRAM_API_HASH to store it in your own Telegram account instead.',
          }
        : {
            variant: 'success',
            label: 'Connected',
            detail: storage.accountIdentifier
              ? `Linked as ${storage.accountIdentifier}. Ciphertext is stored in Saved Messages.`
              : 'Linked. Ciphertext is stored in Saved Messages.',
          };
    case 'error':
      return {
        variant: 'danger',
        label: 'Needs attention',
        detail: storage.lastErrorCode
          ? `Last error: ${storage.lastErrorCode}. Reconnect from settings.`
          : 'The provider rejected the last operation. Reconnect from settings.',
      };
    case 'expired':
      return {
        variant: 'warning',
        label: 'Expired',
        detail: 'The Telegram session expired. Reconnect before uploading.',
      };
    case 'disconnected':
      return {
        variant: 'warning',
        label: 'Disconnected',
        detail: 'Storage was disconnected. Files remain, but transfers are paused until you reconnect.',
      };
    default:
      return {
        variant: 'muted',
        label: 'Not connected',
        detail:
          'Link your Telegram account in settings to store ciphertext in your own Saved Messages.',
      };
  }
}
