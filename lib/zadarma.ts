import { createHash, createHmac } from 'node:crypto';

// Zadarma uses HMAC-SHA1 signed requests with a user_key + secret.
// Signature spec (from Zadarma docs):
//   base64(hex(hmac_sha1(method_path + params_str + md5(params_str), secret)))
// where params_str is the alpha-sorted "k=v&k=v" query string.

const BASE_URL = 'https://api.zadarma.com';

interface ZadarmaCreds {
  userKey: string;
  secret: string;
}

function readCreds(): ZadarmaCreds | null {
  const userKey = process.env.ZADARMA_USER_KEY?.trim();
  const secret = process.env.ZADARMA_SECRET?.trim();
  if (!userKey || !secret) return null;
  return { userKey, secret };
}

function buildParamsString(params: Record<string, string | number>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
}

function signature(method: string, paramsStr: string, secret: string): string {
  const md5 = createHash('md5').update(paramsStr).digest('hex');
  const hexHmac = createHmac('sha1', secret).update(method + paramsStr + md5).digest('hex');
  return Buffer.from(hexHmac, 'utf-8').toString('base64');
}

interface ZadarmaResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  [k: string]: unknown;
}

async function call<T = ZadarmaResponse>(
  method: string,
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE',
  params: Record<string, string | number> = {},
): Promise<T> {
  const creds = readCreds();
  if (!creds) throw new Error('ZADARMA_USER_KEY or ZADARMA_SECRET not configured');
  const paramsStr = buildParamsString(params);
  const sig = signature(method, paramsStr, creds.secret);
  const url = paramsStr ? `${BASE_URL}${method}?${paramsStr}` : `${BASE_URL}${method}`;

  const res = await fetch(url, {
    method: httpMethod,
    headers: {
      Authorization: `${creds.userKey}:${sig}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Zadarma returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || (data as ZadarmaResponse).status === 'error') {
    const msg = (data as ZadarmaResponse).message ?? `HTTP ${res.status}`;
    throw new Error(`Zadarma ${method} failed: ${msg}`);
  }
  return data as T;
}

// -------- Public API --------

interface AvailableNumber {
  id: number;
  number: string;
  price?: number;
  monthly_fee?: number;
  connect_fee?: number;
}

interface ListAvailableResponse extends ZadarmaResponse {
  numbers: AvailableNumber[];
}

export async function listAvailableNumbers(directionId: number): Promise<AvailableNumber[]> {
  const res = await call<ListAvailableResponse>(
    `/v1/direct_numbers/available/${directionId}/`,
    'GET',
  );
  return res.numbers ?? [];
}

interface OrderResponse extends ZadarmaResponse {
  number?: string;
  id?: number;
}

export async function orderNumber(numberId: number): Promise<OrderResponse> {
  return call<OrderResponse>('/v1/direct_numbers/order/', 'POST', {
    direction_id: numberId,
  });
}

/**
 * Configure the External Server SIP URI on a Zadarma virtual number, so
 * inbound calls get forwarded to Vapi.
 *
 * @param number  the virtual number in international format without leading +
 * @param sipUri  destination, e.g. "+33123456789@sip.vapi.ai"
 */
export async function setExternalSipUri(number: string, sipUri: string): Promise<ZadarmaResponse> {
  return call('/v1/direct_numbers/set_sip_id/', 'PUT', {
    number,
    sip_id: sipUri,
  });
}

interface CountryDirection {
  id: number;
  direction: string;
  connect_fee: number;
  monthly_fee: number;
  currency: string;
}

interface CountryResponse extends ZadarmaResponse {
  info: CountryDirection[];
}

export async function listFrenchDirections(): Promise<CountryDirection[]> {
  // Country codes follow ISO 3166-1 alpha-2; "FR" is the French country code.
  const res = await call<CountryResponse>('/v1/direct_numbers/country/', 'GET', {
    country_code: 'FR',
  });
  return res.info ?? [];
}
