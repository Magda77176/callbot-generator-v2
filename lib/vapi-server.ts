// Server-side Vapi API client. Reads VAPI_API_KEY from env and authenticates
// every call with Bearer auth. Never call this from a client component — the
// API key would leak.

const BASE = 'https://api.vapi.ai';

function apiKey(): string {
  const k = process.env.VAPI_API_KEY?.trim();
  if (!k) throw new Error('VAPI_API_KEY not configured');
  return k;
}

async function get<T>(path: string, query?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey()}` },
    // Force fresh data on the admin pages — we want live numbers.
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Vapi GET ${path} → ${res.status}: ${await res.text().catch(() => '')}`);
  }
  return (await res.json()) as T;
}

// -------- Shapes (subset of what Vapi returns) --------

export interface VapiAssistant {
  id: string;
  name?: string;
  createdAt: string;
  updatedAt?: string;
  model?: { provider?: string; model?: string };
  voice?: { provider?: string; voiceId?: string };
  metadata?: Record<string, unknown>;
}

export interface VapiCallCostBreakdown {
  transport?: number;
  stt?: number;
  llm?: number;
  tts?: number;
  vapi?: number;
  total?: number;
}

export interface VapiCall {
  id: string;
  assistantId?: string;
  type?: 'inboundPhoneCall' | 'outboundPhoneCall' | 'webCall' | string;
  status?: string;
  endedReason?: string;
  startedAt?: string;
  endedAt?: string;
  cost?: number;
  costBreakdown?: VapiCallCostBreakdown;
  customer?: { number?: string };
  phoneCallProvider?: string;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
}

// -------- Public API --------

export async function listAssistants(limit = 100): Promise<VapiAssistant[]> {
  return get<VapiAssistant[]>('/assistant', { limit });
}

export async function listCalls(opts: {
  limit?: number;
  assistantId?: string;
  createdAtGt?: string;
} = {}): Promise<VapiCall[]> {
  const q: Record<string, string | number> = { limit: opts.limit ?? 100 };
  if (opts.assistantId) q.assistantId = opts.assistantId;
  if (opts.createdAtGt) q.createdAtGt = opts.createdAtGt;
  return get<VapiCall[]>('/call', q);
}

export async function getCall(id: string): Promise<VapiCall> {
  return get<VapiCall>(`/call/${id}`);
}

export async function getAssistant(id: string): Promise<VapiAssistant> {
  return get<VapiAssistant>(`/assistant/${id}`);
}

// -------- Aggregations --------

export function durationSeconds(call: VapiCall): number {
  if (!call.startedAt || !call.endedAt) return 0;
  const start = new Date(call.startedAt).getTime();
  const end = new Date(call.endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function fmtCost(cost: number | undefined): string {
  if (cost === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(cost);
}

export function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso));
}
