import { describe, expect, it } from 'vitest';
import { formatDate, formatRelativeDate } from '@/lib/utils/format';

const now = new Date('2026-10-25T15:00:00.000Z');

describe('formatRelativeDate', () => {
  it('labels today and yesterday by calendar day', () => {
    expect(formatRelativeDate('2026-10-25T01:00:00.000Z', now)).toBe('Today');
    expect(formatRelativeDate('2026-10-24T23:00:00.000Z', now)).toBe('Yesterday');
  });

  it('uses day counts within a week', () => {
    expect(formatRelativeDate('2026-10-21T10:00:00.000Z', now)).toBe('4 days ago');
  });

  it('falls back to an absolute date after a week', () => {
    expect(formatRelativeDate('2026-10-01T10:00:00.000Z', now)).toBe('Oct 1, 2026');
  });

  it('never invents a date from bad input', () => {
    expect(formatRelativeDate('not-a-date', now)).toBe('Unknown');
    expect(formatDate('not-a-date')).toBe('Unknown');
  });
});
