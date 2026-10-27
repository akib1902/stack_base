/**
 * Which in-browser preview a file can have (FR-08, C4). Classification runs on
 * the stored metadata only — nothing about the content is known until the
 * client has decrypted it, and only images, video, audio and PDFs ever get a
 * viewer. Everything else shows the generic unsupported-file view.
 */

export type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'none';

const EXTENSION_KINDS: Record<string, PreviewKind> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  avif: 'image',
  bmp: 'image',
  svg: 'image',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  m4v: 'video',
  ogv: 'video',
  mp3: 'audio',
  m4a: 'audio',
  wav: 'audio',
  ogg: 'audio',
  opus: 'audio',
  flac: 'audio',
  aac: 'audio',
  pdf: 'pdf',
};

const extensionOf = (name: string): string => {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1).toLowerCase() : '';
};

export function previewKindFor(mimeType: string, fileName: string): PreviewKind {
  const mime = mimeType.toLowerCase().split(';')[0]?.trim() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  // Uploads of unknown type still classify by extension (octet-stream, etc.).
  if (mime === '' || mime === 'application/octet-stream' || mime === 'binary/octet-stream') {
    return EXTENSION_KINDS[extensionOf(fileName)] ?? 'none';
  }
  return 'none';
}

/** Previews decrypt in memory, so very large files are download-only (lazy loading). */
export const MAX_PREVIEW_BYTES = 64 * 1024 * 1024;