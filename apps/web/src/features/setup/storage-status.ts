import type { SetupStatusResponse } from '@stackbase/contracts';

export type StatusVariant = 'success' | 'muted' | 'warning' | 'danger';

export interface StorageStatusSummary {
  variant: StatusVariant;
  label: string;
  detail: string;
}

/**
 * Single source of truth for how connection state is described, shared by the
 * dashboard and settings so both always tell the same story.
 */
export function describeStorage(storage: SetupStatusResponse['storage']): StorageStatusSummary {
  switch (storage.status) {
    case 'connected':
      return {
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
        detail: 'Storage was disconnected. Files remain, but transfers are paused.',
      };
    default:
      return {
        variant: 'muted',
        label: 'Not connected',
        detail: 'Telegram linking ships with encrypted uploads in Milestone 3.',
      };
  }
}
