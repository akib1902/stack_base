import { describe, expect, it } from 'vitest';
import { categoryExpression } from '../src/modules/library/categories';
import {
  extensionOf,
  isUuid,
  normalizeDescription,
  normalizeName,
  normalizeTagName,
} from '../src/modules/library/names';

describe('normalizeName', () => {
  it('trims and preserves legitimate spaces', () => {
    expect(normalizeName('  Q3  plan.txt  ')).toBe('Q3  plan.txt');
  });

  it('rejects empty, reserved and path-like names', () => {
    expect(() => normalizeName('   ')).toThrowError(/required/i);
    expect(() => normalizeName('.')).toThrowError(/reserved/i);
    expect(() => normalizeName('..')).toThrowError(/reserved/i);
    expect(() => normalizeName('../escape.txt')).toThrowError(/slashes/i);
    expect(() => normalizeName('folder\\file.txt')).toThrowError(/slashes/i);
    expect(() => normalizeName('bad\u0000name')).toThrowError(/slashes|control/i);
  });

  it('enforces the length limit', () => {
    expect(normalizeName('a'.repeat(255))).toHaveLength(255);
    expect(() => normalizeName('a'.repeat(256))).toThrowError(/255/);
  });
});

describe('extensionOf', () => {
  it('returns a lower-case extension without the dot', () => {
    expect(extensionOf('photo.JPG')).toBe('jpg');
    expect(extensionOf('archive.tar.gz')).toBe('gz');
    expect(extensionOf('report.final.pdf')).toBe('pdf');
  });

  it('treats hidden files and unusual suffixes as extensionless', () => {
    expect(extensionOf('.env')).toBeNull();
    expect(extensionOf('README')).toBeNull();
    expect(extensionOf('trailing.')).toBeNull();
    expect(extensionOf('weird.thing-with-dash')).toBeNull();
    expect(extensionOf(`name.${'x'.repeat(17)}`)).toBeNull();
  });
});

describe('tag and description normalization', () => {
  it('trims tag names and enforces the limit', () => {
    expect(normalizeTagName('  Travel  ')).toBe('Travel');
    expect(() => normalizeTagName('')).toThrowError(/required/i);
    expect(() => normalizeTagName('t'.repeat(65))).toThrowError(/64/);
  });

  it('stores blank descriptions as null', () => {
    expect(normalizeDescription('  hello  ')).toBe('hello');
    expect(normalizeDescription('   ')).toBeNull();
    expect(normalizeDescription(null)).toBeNull();
    expect(() => normalizeDescription('d'.repeat(2001))).toThrowError(/2000/);
  });
});

describe('isUuid', () => {
  it('accepts canonical UUIDs only', () => {
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('11111111-1111-4111-8111-11111111111')).toBe(false);
  });
});

describe('categoryExpression', () => {
  it('classifies mime types before extensions and always has a fallback', () => {
    const expression = categoryExpression('f');
    expect(expression).toContain("like 'image/%'");
    expect(expression).toContain("mime_type");
    expect(expression).toContain("'apks'");
    expect(expression).toContain("'documents'");
    expect(expression).toContain("else 'other'");
    expect(expression).not.toContain('$1');
  });
});
