import { describe, expect, it } from 'vitest';
import { MAX_PREVIEW_BYTES, previewKindFor } from '../src/features/previews/preview-kind';

describe('previewKindFor', () => {
  it('classifies by mime type first', () => {
    expect(previewKindFor('image/png', 'x.bin')).toBe('image');
    expect(previewKindFor('IMAGE/JPEG; charset=binary', 'x')).toBe('image');
    expect(previewKindFor('video/mp4', 'clip')).toBe('video');
    expect(previewKindFor('audio/mpeg', 'song')).toBe('audio');
    expect(previewKindFor('application/pdf', 'doc')).toBe('pdf');
  });

  it('falls back to the extension for generic upload types', () => {
    expect(previewKindFor('application/octet-stream', 'holiday.PNG')).toBe('image');
    expect(previewKindFor('application/octet-stream', 'movie.webm')).toBe('video');
    expect(previewKindFor('', 'podcast.m4a')).toBe('audio');
    expect(previewKindFor('application/octet-stream', 'manual.pdf')).toBe('pdf');
    expect(previewKindFor('application/octet-stream', 'no-extension')).toBe('none');
  });

  it('never previews untrusted or executable types', () => {
    expect(previewKindFor('text/html', 'page.html')).toBe('none');
    expect(previewKindFor('application/vnd.android.package-archive', 'app.apk')).toBe('none');
    expect(previewKindFor('application/zip', 'archive.zip')).toBe('none');
    expect(previewKindFor('text/plain', 'notes.txt')).toBe('none');
  });

  it('caps preview size so large files stay download-only', () => {
    expect(MAX_PREVIEW_BYTES).toBe(64 * 1024 * 1024);
  });
});