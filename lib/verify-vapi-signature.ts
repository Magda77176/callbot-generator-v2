import { timingSafeEqual } from 'node:crypto';

/**
 * Vapi sends the configured `server.secret` as the `x-vapi-secret` header on
 * outbound webhook requests. We compare in constant time to avoid leaking
 * the secret through response-time differences.
 */
export function verifyVapiSecret(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
