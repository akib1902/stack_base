'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Clock,
  FolderOpen,
  Home,
  Settings,
  Share2,
  Star,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  available: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, available: true },
  { href: '/files', label: 'All files', icon: FolderOpen, available: true },
  { href: '/recent', label: 'Recent', icon: Clock, available: true },
  { href: '/favorites', label: 'Favorites', icon: Star, available: true },
  { href: '/shared', label: 'Shared', icon: Share2, available: false },
  { href: '/trash', label: 'Trash', icon: Trash2, available: true },
];

const SECONDARY_NAV: NavItem[] = [
  { href: '/uploads', label: 'Uploads', icon: Upload, available: false },
  { href: '/settings', label: 'Settings', icon: Settings, available: true },
];

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  if (!item.available) {
    // Not a dead link: upcoming destinations are announced, not clickable.
    return (
      <div
        aria-disabled="true"
        title="Available in an upcoming milestone"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted/80"
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-surface-raised font-semibold text-foreground'
          : 'text-foreground/85 hover:bg-surface-raised',
      )}
    >
      <Icon
        className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted')}
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="px-3 pb-4">
      <ul className="space-y-0.5">
        {PRIMARY_NAV.map((item) => (
          <li key={item.label}>
            <NavRow
            item={item}
            active={
              pathname === item.href ||
              (item.href === '/files' && pathname.startsWith('/files'))
            }
          />
          </li>
        ))}
      </ul>

      <ul className="mt-4 space-y-0.5 border-t border-border pt-3">
        {SECONDARY_NAV.map((item) => (
          <li key={item.label}>
            <NavRow
            item={item}
            active={
              pathname === item.href ||
              (item.href === '/files' && pathname.startsWith('/files'))
            }
          />
          </li>
        ))}
      </ul>
    </nav>
  );
}
