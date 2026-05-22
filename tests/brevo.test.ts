import { describe, expect, it } from 'vitest';
import { formatFrenchDate, toE164French } from '@/lib/brevo';

describe('toE164French', () => {
  it('converts standard mobile with spaces', () => {
    expect(toE164French('06 12 34 56 78')).toBe('+33612345678');
  });

  it('converts mobile with no separators', () => {
    expect(toE164French('0612345678')).toBe('+33612345678');
  });

  it('converts landline starting with 01', () => {
    expect(toE164French('01 23 45 67 89')).toBe('+33123456789');
  });

  it('accepts already-formatted E.164', () => {
    expect(toE164French('+33612345678')).toBe('+33612345678');
  });

  it('accepts 33-prefixed without plus', () => {
    expect(toE164French('33612345678')).toBe('+33612345678');
  });

  it('tolerates dots and dashes', () => {
    expect(toE164French('06.12.34.56.78')).toBe('+33612345678');
    expect(toE164French('06-12-34-56-78')).toBe('+33612345678');
  });

  it('rejects numbers that are too short', () => {
    expect(toE164French('06 12 34 56')).toBeNull();
  });

  it('rejects numbers that are too long', () => {
    expect(toE164French('06 12 34 56 78 90')).toBeNull();
  });

  it('rejects numbers not starting with a valid digit', () => {
    expect(toE164French('00 12 34 56 78')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(toE164French('not a phone')).toBeNull();
  });
});

describe('formatFrenchDate', () => {
  it('renders ISO date in French long form', () => {
    expect(formatFrenchDate('2026-05-25')).toBe('25 mai 2026');
    expect(formatFrenchDate('2026-12-01')).toBe('1 décembre 2026');
  });

  it('returns input unchanged when not ISO', () => {
    expect(formatFrenchDate('not-a-date')).toBe('not-a-date');
  });
});
