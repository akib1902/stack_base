'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus } from 'lucide-react';
import type { FolderSummary } from '@stackbase/contracts';
import { Button } from '@/components/ui/Button';
import { FolderDialog } from './FolderDialog';

export function NewFolderButton({
  folders,
  parentId,
}: {
  folders: readonly FolderSummary[];
  parentId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <FolderPlus className="size-4" aria-hidden="true" />
        New folder
      </Button>
      <FolderDialog
        open={open}
        mode="create"
        folders={folders}
        defaultParentId={parentId}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
