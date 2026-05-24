// Telnyx v2 REST API wrapper, scoped to the operations we need to provision
// a French DID and wire it to a Vapi SIP URI.
//
// Auth: Bearer ${TELNYX_API_KEY}
// Base URL: https://api.telnyx.com/v2
//
// Flow we automate:
//   1. GET /available_phone_numbers?filter[country_code]=FR  → list of FR DIDs
//   2. POST /number_orders                                   → buy one
//   3. PATCH /phone_numbers/{id}                             → assign to our
//      pre-existing SIP Connection (TELNYX_CONNECTION_ID)
//   4. PATCH /phone_numbers/{id}/voice                       → set
//      translated_number to the Vapi SIP URI for that assistant
//
// The "translated number" is the magic bit: Telnyx rewrites the SIP INVITE so
// inbound calls land on a specific Vapi SIP URI (sip:user@sip.vapi.ai), which
// Vapi maps back to a specific assistant via the SIP phone-number record.

const BASE = 'https://api.telnyx.com/v2';

function apiKey(): string {
  const key = process.env.TELNYX_API_KEY?.trim();
  if (!key) throw new Error('TELNYX_API_KEY not configured');
  return key;
}

interface TelnyxResponse<T = unknown> {
  data: T;
  meta?: unknown;
  errors?: Array<{ code: string; title: string; detail?: string }>;
}

async function call<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | string[]> } = {},
): Promise<T> {
  const { query, ...rest } = init;
  const url = new URL(`${BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const res = await fetch(url.toString(), {
    ...rest,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(rest.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: TelnyxResponse<T>;
  try {
    json = JSON.parse(text) as TelnyxResponse<T>;
  } catch {
    throw new Error(`Telnyx returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.errors?.length) {
    const detail = json.errors?.[0]?.detail ?? json.errors?.[0]?.title ?? `HTTP ${res.status}`;
    throw new Error(`Telnyx ${path} → ${detail}`);
  }
  return json.data;
}

// -------- Available numbers --------

export interface AvailablePhoneNumber {
  phone_number: string;
  vanity_format?: string;
  best_effort?: boolean;
  reservable?: boolean;
  cost_information?: {
    upfront_cost?: string;
    monthly_cost?: string;
    currency?: string;
  };
}

export async function listAvailableFrenchNumbers(
  limit = 5,
): Promise<AvailablePhoneNumber[]> {
  return call<AvailablePhoneNumber[]>('/available_phone_numbers', {
    query: {
      'filter[country_code]': 'FR',
      'filter[features][]': ['voice'],
      'filter[limit]': limit,
    },
  });
}

// -------- Number orders --------

export interface NumberOrder {
  id: string;
  status: 'pending' | 'success' | 'failure';
  phone_numbers: Array<{
    id?: string;
    phone_number: string;
    status?: string;
    regulatory_requirements_met?: boolean;
  }>;
}

export async function orderNumber(phoneNumber: string): Promise<NumberOrder> {
  return call<NumberOrder>('/number_orders', {
    method: 'POST',
    body: JSON.stringify({
      phone_numbers: [{ phone_number: phoneNumber }],
    }),
  });
}

// -------- Phone numbers (assigned to your account) --------

export interface PhoneNumber {
  id: string;
  phone_number: string;
  connection_id?: string;
  voice?: { translated_number?: string };
}

export async function findPhoneNumber(phoneNumber: string): Promise<PhoneNumber | null> {
  const data = await call<PhoneNumber[]>('/phone_numbers', {
    query: { 'filter[phone_number]': phoneNumber },
  });
  return data[0] ?? null;
}

export async function assignConnection(
  phoneNumberId: string,
  connectionId: string,
): Promise<PhoneNumber> {
  return call<PhoneNumber>(`/phone_numbers/${phoneNumberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ connection_id: connectionId }),
  });
}

export async function setVoiceTranslatedNumber(
  phoneNumberId: string,
  translatedNumber: string,
): Promise<unknown> {
  return call<unknown>(`/phone_numbers/${phoneNumberId}/voice`, {
    method: 'PATCH',
    body: JSON.stringify({ translated_number: translatedNumber }),
  });
}
