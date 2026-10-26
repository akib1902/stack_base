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
import { LIBRARY_CATEGORIES, type LibraryCategory } from '@stackbase/contracts';

export type Tint = 'amber' | 'rose' | 'indigo' | 'sky' | 'teal' | 'slate';

interface CategoryMeta {
  label: string;
  empty: string;
  icon: LucideIcon;
  tint: Tint;
}

export const CATEGORY_META: Record<LibraryCategory, CategoryMeta> = {
  images: { label: 'Photos', empty: 'No photos yet', icon: ImageIcon, tint: 'amber' },
  videos: { label: 'Videos', empty: 'No videos yet', icon: Film, tint: 'rose' },
  audio: { label: 'Audio', empty: 'No audio yet', icon: Music, tint: 'indigo' },
  documents: { label: 'Documents', empty: 'No documents yet', icon: FileText, tint: 'sky' },
  apks: { label: 'APKs', empty: 'No APKs yet', icon: Smartphone, tint: 'teal' },
  archives: { label: 'Archives', empty: 'No archives yet', icon: Archive, tint: 'slate' },
  apps: { label: 'Apps', empty: 'No apps yet', icon: AppWindow, tint: 'indigo' },
  downloads: { label: 'Downloads', empty: 'No downloads yet', icon: Download, tint: 'sky' },
  other: { label: 'Other files', empty: 'Nothing unsorted', icon: FileQuestion, tint: 'slate' },
};

/** Visual order matches the API order, so tiles never reshuffle. */
export const CATEGORY_ORDER: LibraryCategory[] = [...LIBRARY_CATEGORIES];
