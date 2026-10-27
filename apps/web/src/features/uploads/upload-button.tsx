'use client';

import { useRef, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useVaultGate } from '@/features/encryption/use-vault-gate';
import { useUploads } from './upload-context';

/**
 * The library's upload entry point. Files are handed to the queue as `File`
 * objects and never read here: the pipeline encrypts each one in chunk order
 * and streams ciphertext, so nothing plaintext ever leaves the page.
 */
export function UploadButton({
  folderId,
  label = 'Upload',
}: {
  folderId: string | null;
  label?: string;
}) {
  const uploads = useUploads();
  const gate = useVaultGate();
  const input = useRef<HTMLInputElement>(null);

  const pick = (): void => {
    gate.requireUnlocked(() => input.current?.click());
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);
    // Allow re-selecting the same file after a failure.
    event.target.value = '';
    uploads.enqueue(files, folderId);
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onChange}
      />
      <Button type="button" size="sm" onClick={pick}>
        <Upload className="size-3.5" aria-hidden="true" />
        {label}
      </Button>
      {gate.dialog}
    </>
  );
}
