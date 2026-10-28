import type { PublicShare } from '@stackbase/contracts';
import { Ban, Clock3, Link2Off, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PublicShareView } from '@/features/shares/public-share-view';
import { ApiRequestError, apiFetchPublic } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

const REFUSAL: Record<string, { title: string; message: string }> = {
  SHARE_NOT_FOUND: {
    title: 'This link is not valid',
    message: 'No share matches this address. Check that the whole link was copied correctly.',
  },
  SHARE_REVOKED: {
    title: 'This link was revoked',
    message: 'The owner stopped sharing this file. Ask them for a new link if you still need it.',
  },
  SHARE_EXPIRED: {
    title: 'This link expired',
    message: 'The owner set an expiry date and it has passed. Ask them for a fresh link.',
  },
  SHARE_DOWNLOAD_LIMIT_REACHED: {
    title: 'Download limit reached',
    message: 'This link only allowed a fixed number of downloads, and they have all been used.',
  },
  SHARE_FILE_UNAVAILABLE: {
    title: 'This file is no longer available',
    message: 'The owner deleted this file, so its share cannot be opened.',
  },
  STORAGE_RECONCILIATION_REQUIRED: {
    title: 'This file is temporarily unavailable',
    message: 'The owner’s storage provider does not currently have a verified copy. Try later.',
  },
};

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return (
      <Refusal
        title="This link is not valid"
        message="No share matches this address. Check that the whole link was copied correctly."
      />
    );
  }

  let view: PublicShare;
  try {
    view = await apiFetchPublic<PublicShare>(
      `/api/v1/public/shares/${encodeURIComponent(token)}`,
    );
  } catch (error) {
    if (error instanceof ApiRequestError) {
      const copy = REFUSAL[error.code] ?? {
        title: 'This link cannot be opened',
        message: error.message,
      };
      return <Refusal title={copy.title} message={copy.message} />;
    }
    throw error;
  }

  return <PublicShareView token={token} initialView={view} />;
}

function Refusal({ title, message }: { title: string; message: string }) {
  const Icon =
    title === 'This link expired'
      ? Clock3
      : title === 'This link was revoked'
        ? Ban
        : title === 'This link is not valid'
          ? Link2Off
          : ShieldAlert;

  return (
    <Card className="w-full max-w-lg">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-error/10 text-error">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{message}</p>
        </div>
      </div>
    </Card>
  );
}
