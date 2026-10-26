'use client';

import { Button } from '@/components/ui/Button';
import { Dialog, FormError } from '@/components/ui/Dialog';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  error = null,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{description}</p>
      {error ? (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      ) : null}
    </Dialog>
  );
}
