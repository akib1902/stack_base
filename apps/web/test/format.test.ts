import { describe, expect, it } from 'vitest';
import { formatBytes, formatCount, formatDateTime, formatDuration } from '@/lib/utils/format';

describe('formatBytes', () => {
  it('reports zero and negative values without inventing a unit', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-12)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });

  it('formats byte, kilobyte and gigabyte ranges', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(4096)).toBe('4.00 KB');
    expect(formatBytes(1536 * 1024)).toBe('1.50 MB');
    expect(formatBytes(2.5 * 1024 ** 3)).toBe('2.50 GB');
  });

  it('drops decimals once the number is large', () => {
    expect(formatBytes(150 * 1024)).toBe('150 KB');
  });
});

describe('formatCount', () => {
  it('pluralizes correctly', () => {
    expect(formatCount(0, 'file')).toBe('0 files');
    expect(formatCount(1, 'file')).toBe('1 file');
    expect(formatCount(2, 'folder')).toBe('2 folders');
  });
});

describe('formatDuration', () => {
  it('renders minutes and hours', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(125)).toBe('2m');
    expect(formatDuration(3 * 3600 + 60)).toBe('3h 1m');
  });
});

describe('formatDateTime', () => {
  it('formats ISO timestamps and tolerates invalid input', () => {
    expect(formatDateTime('2026-10-25T12:00:00.000Z')).toContain('2026');
    expect(formatDateTime('not-a-date')).toBe('Unknown');
  });
});
