'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { VaultRecord, VaultResponse } from '@stackbase/contracts';
import { CryptoError } from '@/lib/crypto/errors';
import { createVault as buildVault, unlockVault } from '@/lib/crypto/vault';
import { sendJson } from '@/lib/api/browser';

/**
 * Holds the vault key for the life of the page. It is deliberately React state
 * and nothing else: no cookie, no storage, no server round-trip. Reloading the
 * page locks the vault again, which is the documented trade-off of `stackbase/1`.
 */

export type VaultStatus = 'absent' | 'locked' | 'unlocked';

export interface VaultContextValue {
  record: VaultRecord | null;
  status: VaultStatus;
  /** Set only while unlocked; never serialised, never sent anywhere. */
  key: Uint8Array | null;
  create(passphrase: string): Promise<void>;
  unlock(passphrase: string): Promise<void>;
  lock(): void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({
  record: initialRecord,
  children,
}: {
  record: VaultRecord | null;
  children: ReactNode;
}) {
  const [record, setRecord] = useState<VaultRecord | null>(initialRecord);
  const [key, setKey] = useState<Uint8Array | null>(null);

  const create = useCallback(async (passphrase: string) => {
    const { request, vaultKey } = await buildVault(passphrase);
    const response = await sendJson<VaultResponse>('/api/encryption/vault', {
      method: 'POST',
      body: request,
    });
    setRecord(response.vault);
    setKey(vaultKey);
  }, []);

  const unlock = useCallback(
    async (passphrase: string) => {
      if (!record) {
        throw new CryptoError('WRONG_VAULT_KEY', 'No vault exists for this account yet.');
      }
      setKey(await unlockVault(record, passphrase));
    },
    [record],
  );

  const lock = useCallback(() => {
    setKey(null);
  }, []);

  const value = useMemo<VaultContextValue>(
    () => ({
      record,
      key,
      status: record === null ? 'absent' : key === null ? 'locked' : 'unlocked',
      create,
      unlock,
      lock,
    }),
    [create, key, lock, record, unlock],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const value = useContext(VaultContext);
  if (!value) {
    throw new Error('useVault must be used inside a VaultProvider.');
  }
  return value;
}
