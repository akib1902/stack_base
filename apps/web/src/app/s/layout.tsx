import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Shared file',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

/** Public share pages carry no app chrome and must never leak the link token. */
export default function PublicShareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-glow flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span className="grid size-7 place-items-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">
          SB
        </span>
        StackBase
      </div>
      {children}
      <p className="mt-5 max-w-md text-center text-[11px] leading-relaxed text-muted">
        Files are encrypted before they leave the sender’s device. StackBase stores and serves
        ciphertext only.
      </p>
    </div>
  );
}
