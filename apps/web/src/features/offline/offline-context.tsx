'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, UpdateFileRequest } from '@stackbase/contracts';
import { getFileVersionAction, setFileTagsAction, updateFileAction } from '@/features/library/actions';
import { adoptAccount } from './metadata-cache';
import {
  discardOperation,
  listOperations,
  replayQueue,
  type QueuedOperation,
  type ReplayDeps,
  type ReplaySummary,
} from './queue';

export interface OfflineValue {
  online: boolean;
  userId: string;
  offlineEnabled: boolean;
  queued: QueuedOperation[];
  refresh: () => Promise<void>;
  replay: () => Promise<ReplaySummary | null>;
  discard: (id: string) => Promise<void>;
}

const OfflineContext = createContext<OfflineValue | null>(null);

export function useOffline(): OfflineValue {
  const value = useContext(OfflineContext);
  if (!value) throw new Error('useOffline must be used inside <OfflineProvider>.');
  return value;
}

/**
 * Owns everything offline: service-worker registration, the account-scoped
 * metadata mirror, connectivity state and the queued-operation replay loop.
 * Mounted once in the authenticated app layout.
 */
export function OfflineProvider({
  user,
  offlineEnabled,
  children,
}: {
  user: AuthUser;
  offlineEnabled: boolean;
  children: ReactNode;
}) {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  );
  const [queued, setQueued] = useState<QueuedOperation[]>([]);

  const userId = user.id;
  const router = useRouter();

  const refresh = useCallback(async () => {
    const operations = await listOperations(userId);
    setQueued(operations);
  }, [userId]);

  const replay = useCallback(async (): Promise<ReplaySummary | null> => {
    const deps: ReplayDeps = {
      readVersion: async (resourceId) => {
        const result = await getFileVersionAction(resourceId);
        if (!result.ok) throw new Error(result.message);
        return result.data?.updatedAt ?? null;
      },
      apply: async (operation) => {
        const { patch, tagIds } = operation.payload as {
          patch: UpdateFileRequest;
          tagIds: string[];
        };
        const updated = await updateFileAction(operation.resourceId, patch);
        if (!updated.ok) throw new Error(updated.message);
        if (Array.isArray(tagIds)) {
          const tagged = await setFileTagsAction(operation.resourceId, tagIds);
          if (!tagged.ok) throw new Error(tagged.message);
        }
      },
    };
    const summary = await replayQueue(userId, deps);
    await refresh();
    // Applied changes change server data, so the surfaces built from it (the
    // file list, and any open details dialog) must re-render with the new
    // revision. Without this, the next offline edit would be based on the
    // version from before the replay and be flagged as a false conflict.
    if (summary.applied > 0) router.refresh();
    return summary;
  }, [refresh, router, userId]);

  const discard = useCallback(
    async (id: string) => {
      await discardOperation(id);
      await refresh();
    },
    [refresh],
  );

  // Service worker: public shell assets and the offline fallback only.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* private-mode or unsupported: the app still works online */
    });
  }, []);

  // Account adoption: switching accounts drops the previous mirror.
  useEffect(() => {
    void adoptAccount(userId, user.email);
  }, [user.email, userId]);

  useEffect(() => {
    void refresh();

    const handleOnline = () => {
      setOnline(true);
      void replay();
    };
    const handleOffline = () => {
      setOnline(false);
      void refresh();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh, replay]);

  const value = useMemo<OfflineValue>(
    () => ({ online, userId, offlineEnabled, queued, refresh, replay, discard }),
    [discard, offlineEnabled, online, queued, refresh, replay, userId],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}