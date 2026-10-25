import {
  AppWindow,
  Archive,
  Download,
  FileQuestion,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import type { LibraryCategory } from '@stackbase/contracts';

export type Tint = 'amber' | 'rose' | 'indigo' | 'sky' | 'teal' | 'slate';

interface CategoryMeta {
  label: string;
  empty: string;
  icon: LucideIcon;
  tint: Tint;
  /** Bento span at desktop width; the whole row always sums to four columns. */
  span: string;
}

export const CATEGORY_META: Record<LibraryCategory, CategoryMeta> = {
  images: {
    label: 'Photos',
    empty: 'No photos yet',
    icon: ImageIcon,
    tint: 'amber',
    span: 'col-span-2',
  },
  videos: { label: 'Videos', empty: 'No videos yet', icon: Film, tint: 'rose', span: 'col-span-1' },
  audio: { label: 'Audio', empty: 'No audio yet', icon: Music, tint: 'indigo', span: 'col-span-1' },
  documents: {
    label: 'Documents',
    empty: 'No documents yet',
    icon: FileText,
    tint: 'sky',
    span: 'col-span-1',
  },
  apks: {
    label: 'APKs',
    empty: 'No APKs yet',
    icon: Smartphone,
    tint: 'teal',
    span: 'col-span-1',
  },
  archives: {
    label: 'Archives',
    empty: 'No archives yet',
    icon: Archive,
    tint: 'slate',
    span: 'col-span-1',
  },
  apps: { label: 'Apps', empty: 'No apps yet', icon: AppWindow, tint: 'indigo', span: 'col-span-1' },
  downloads: {
    label: 'Downloads',
    empty: 'No downloads yet',
    icon: Download,
    tint: 'sky',
    span: 'col-span-2',
  },
  other: {
    label: 'Other files',
    empty: 'Nothing unsorted',
    icon: FileQuestion,
    tint: 'slate',
    span: 'col-span-2',
  },
};
