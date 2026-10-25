import type { ReactNode } from 'react';
import { HardDrive } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-12">
      <div className="auth-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"
          >
            <HardDrive className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">StackBase</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Personal cloud</p>
          </div>
        </div>
        {children}
        <p className="mt-6 text-[11px] leading-relaxed text-muted">
          Self-hosted. Your files are encrypted in the browser and stored in your own Telegram
          account; StackBase never holds your decryption keys.
        </p>
      </div>
    </div>
  );
}
