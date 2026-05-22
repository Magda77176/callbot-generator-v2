import { describe, expect, it } from 'vitest';
import { verifyVapiSecret } from '@/lib/verify-vapi-signature';

describe('verifyVapiSecret', () => {
  it('returns true on exact match', () => {
    expect(verifyVapiSecret('abc123', 'abc123')).toBe(true);
  });

  it('returns false when secrets differ', () => {
    expect(verifyVapiSecret('abc123', 'abc124')).toBe(false);
  });

  it('returns false when lengths differ', () => {
    expect(verifyVapiSecret('abc', 'abcd')).toBe(false);
  });

  it('returns false when received is null', () => {
    expect(verifyVapiSecret(null, 'abc123')).toBe(false);
  });

  it('returns false when expected is undefined', () => {
    expect(verifyVapiSecret('abc123', undefined)).toBe(false);
  });

  it('returns false when both are empty', () => {
    expect(verifyVapiSecret('', '')).toBe(false);
  });
});
