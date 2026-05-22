import { NextRequest, NextResponse } from 'next/server';
import { verifyVapiSecret } from '@/lib/verify-vapi-signature';

interface VapiToolCall {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string | Record<string, unknown>;
  };
}

interface VapiWebhookMessage {
  type?: string;
  call?: { id?: string; status?: string };
  toolCallList?: VapiToolCall[];
  toolCalls?: VapiToolCall[];
  [k: string]: unknown;
}

interface VapiWebhookPayload {
  message?: VapiWebhookMessage;
}

interface ReservationArgs {
  date: string;
  time: string;
  partySize: number;
  customerName: string;
  customerPhone: string;
  dietaryNotes?: string;
  specialRequests?: string;
}

function parseArgs(raw: string | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function validateReservation(
  args: Record<string, unknown>,
): { ok: true; value: ReservationArgs } | { ok: false; error: string } {
  const required = ['date', 'time', 'partySize', 'customerName', 'customerPhone'];
  const missing = required.filter((k) => args[k] === undefined || args[k] === '');
  if (missing.length > 0) return { ok: false, error: `Champs manquants: ${missing.join(', ')}` };

  const date = String(args.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'date doit être AAAA-MM-JJ' };

  const time = String(args.time);
  if (!/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: 'time doit être HH:MM' };

  const partySize = Number(args.partySize);
  if (!Number.isInteger(partySize) || partySize < 1) {
    return { ok: false, error: 'partySize doit être un entier ≥ 1' };
  }

  return {
    ok: true,
    value: {
      date,
      time,
      partySize,
      customerName: String(args.customerName).trim(),
      customerPhone: String(args.customerPhone).trim(),
      dietaryNotes: args.dietaryNotes ? String(args.dietaryNotes).trim() : undefined,
      specialRequests: args.specialRequests ? String(args.specialRequests).trim() : undefined,
    },
  };
}

function handleToolCall(
  call: VapiToolCall,
  callId: string | undefined,
): { toolCallId: string; result: string } {
  const toolCallId = call.id ?? 'unknown';
  const name = call.function?.name;

  if (name !== 'record_reservation') {
    return { toolCallId, result: `Fonction inconnue: ${name}` };
  }

  const parsed = parseArgs(call.function?.arguments);
  const validated = validateReservation(parsed);

  if (!validated.ok) {
    console.warn(`[vapi-webhook] record_reservation rejected: ${validated.error}`, { callId, parsed });
    return { toolCallId, result: `Erreur d'enregistrement: ${validated.error}` };
  }

  // For now: just log the structured reservation. Future: persist, email, SMS.
  console.log('[vapi-webhook] reservation', { callId, ...validated.value });
  return { toolCallId, result: 'Réservation enregistrée avec succès.' };
}

export async function POST(req: NextRequest) {
  const expected = process.env.VAPI_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'VAPI_WEBHOOK_SECRET not configured' }, { status: 503 });
  }

  const received = req.headers.get('x-vapi-secret');
  if (!verifyVapiSecret(received, expected)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: VapiWebhookPayload;
  try {
    payload = (await req.json()) as VapiWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = payload.message;
  const type = message?.type ?? 'unknown';
  const callId = message?.call?.id;

  if (type === 'tool-calls') {
    const calls = message?.toolCallList ?? message?.toolCalls ?? [];
    const results = calls.map((c) => handleToolCall(c, callId));
    return NextResponse.json({ results });
  }

  console.log(`[vapi-webhook] event=${type} call=${callId ?? '-'}`);
  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'vapi-webhook' });
}
