'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, FolderOpen, Home, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const ITEMS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/files', label: 'Files', Icon: FolderOpen },
  { href: '/recent', label: 'Recent', Icon: Clock },
  { href: '/trash', label: 'Trash', Icon: Trash2 },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || (href === '/files' && pathname.startsWith('/files'));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium',
                  active ? 'text-primary' : 'text-muted',
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
