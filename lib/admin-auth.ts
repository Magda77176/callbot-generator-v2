import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Simple HMAC-signed cookie. The value the cookie carries is fixed ("admin");
// what makes it tamper-proof is the signature derived from ADMIN_SECRET.

const COOKIE_NAME = 'cb_admin';
const COOKIE_VALUE = 'admin';

function adminPassword(): string {
  const v = process.env.ADMIN_PASSWORD?.trim();
  if (!v) throw new Error('ADMIN_PASSWORD not configured');
  return v;
}

function adminSecret(): string {
  // Reuse the webhook secret for signing the admin cookie. It's a server-only
  // value already required by the app and rotating it invalidates sessions.
  const v = process.env.VAPI_WEBHOOK_SECRET?.trim() ?? process.env.ADMIN_PASSWORD?.trim();
  if (!v) throw new Error('ADMIN_PASSWORD (or VAPI_WEBHOOK_SECRET) not configured');
  return v;
}

function sign(value: string): string {
  return createHmac('sha256', adminSecret()).update(value).digest('hex');
}

export function makeSignedCookieValue(): string {
  return `${COOKIE_VALUE}.${sign(COOKIE_VALUE)}`;
}

export function verifyCookieValue(raw: string | undefined): boolean {
  if (!raw) return false;
  const [value, sig] = raw.split('.');
  if (value !== COOKIE_VALUE || !sig) return false;
  const expected = sign(value);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function checkPassword(submitted: string): boolean {
  const expected = adminPassword();
  if (submitted.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(submitted), Buffer.from(expected));
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const c = store.get(COOKIE_NAME);
  return verifyCookieValue(c?.value);
}

export { COOKIE_NAME };
