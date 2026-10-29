'use client';

import { useState, type DragEvent, type ReactNode } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useVaultGate } from '@/features/encryption/use-vault-gate';
import { useUploads } from './upload-context';

/**
 * Wraps the library view so files can be dropped straight into the current
 * folder. The drop itself is only a shortcut for the picker: unlocking (or
 * creating) the vault is still enforced through the same gate.
 */
export function UploadDropTarget({
  folderId,
  children,
}: {
  folderId: string | null;
  children: ReactNode;
}) {
  const uploads = useUploads();
  const gate = useVaultGate();
  const [dragging, setDragging] = useState(false);

  const hasFiles = (event: DragEvent<HTMLDivElement>): boolean =>
    Array.from(event.dataTransfer.types).includes('Files');

  return (
    <div
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setDragging(false);
        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) return;
        gate.requireUnlocked(() => uploads.enqueue(files, folderId));
      }}
      className={cn(
        'relative rounded-card transition-shadow',
        dragging && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-card bg-surface/85">
          <p className="flex items-center gap-2 text-sm font-medium text-primary-ink">
            <UploadCloud className="size-4" aria-hidden="true" />
            Drop to encrypt and upload
          </p>
        </div>
      ) : null}
      {children}
      {gate.dialog}
    </div>
  );
}
