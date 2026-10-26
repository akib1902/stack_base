import { Folder } from 'lucide-react';
import type { LibraryCategory, TagSummary } from '@stackbase/contracts';
import { CATEGORY_META, type Tint } from '@/features/library/category-meta';
import { cn } from '@/lib/utils/cn';

export function FileTypeIcon({
  category,
  className,
}: {
  category: LibraryCategory;
  className?: string;
}) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  return (
    <span
      aria-hidden="true"
      className={cn('icon-chip size-10 shrink-0', `tint-${meta.tint}`, className)}
    >
      <Icon className="size-5" />
    </span>
  );
}

export function FolderGlyph({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('icon-chip tint-amber size-10 shrink-0', className)}>
      <Folder className="size-5" />
    </span>
  );
}

const TAG_TINTS: Record<string, Tint> = {
  amber: 'amber',
  rose: 'rose',
  indigo: 'indigo',
  sky: 'sky',
  teal: 'teal',
  slate: 'slate',
};

export function TagChip({ tag, className }: { tag: TagSummary; className?: string }) {
  const tint = tag.colorToken ? TAG_TINTS[tag.colorToken] : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-foreground/85',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full bg-muted', tint && `tint-${tint}`)}
        style={tint ? { backgroundColor: 'rgb(var(--tint))' } : undefined}
      />
      {tag.name}
    </span>
  );
}
