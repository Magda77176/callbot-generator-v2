import { NextRequest, NextResponse } from 'next/server';
import { verifyVapiSecret } from '@/lib/verify-vapi-signature';
import { formatFrenchDate, sendEmail, sendSms, toE164French } from '@/lib/brevo';

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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c] ?? c;
  });
}

function buildEmailHtml(r: ReservationArgs, restaurantName: string): string {
  const optional = (label: string, value?: string) =>
    value && value.trim() ? `<p><strong>${label} :</strong> ${escapeHtml(value)}</p>` : '';
  return `<h2 style="margin:0 0 16px;">Nouvelle réservation — ${escapeHtml(restaurantName)}</h2>
<p><strong>Date :</strong> ${escapeHtml(formatFrenchDate(r.date))}</p>
<p><strong>Heure :</strong> ${escapeHtml(r.time)}</p>
<p><strong>Personnes :</strong> ${r.partySize}</p>
<p><strong>Client :</strong> ${escapeHtml(r.customerName)}</p>
<p><strong>Téléphone :</strong> ${escapeHtml(r.customerPhone)}</p>
${optional('Régime / allergies', r.dietaryNotes)}
${optional('Demandes particulières', r.specialRequests)}
<p style="color:#888;font-size:12px;margin-top:24px;">Reçu via Marco (callbot vocal).</p>`;
}

function buildSmsContent(r: ReservationArgs, restaurantName: string): string {
  const firstName = r.customerName.trim().split(/\s+/)[0] ?? r.customerName;
  const niceTime = r.time.replace(':', 'h');
  return `Bonjour ${firstName}, votre résa au ${restaurantName} pour ${r.partySize} pers. le ${formatFrenchDate(r.date)} à ${niceTime} est confirmée. Merci !`;
}

async function deliverConfirmations(r: ReservationArgs): Promise<void> {
  const restaurateurEmail = process.env.RESTAURATEUR_EMAIL;
  const restaurantName = process.env.RESTAURANT_NAME || 'votre restaurant';

  const tasks: Promise<unknown>[] = [];

  if (restaurateurEmail) {
    tasks.push(
      sendEmail({
        to: restaurateurEmail,
        subject: `Nouvelle résa — ${r.customerName} (${r.partySize} pers.)`,
        htmlBody: buildEmailHtml(r, restaurantName),
      }).then((res) => {
        if (!res.ok) console.warn('[vapi-webhook] email failed', res);
      }),
    );
  }

  const e164 = toE164French(r.customerPhone);
  if (e164) {
    tasks.push(
      sendSms({ to: e164, content: buildSmsContent(r, restaurantName) }).then((res) => {
        if (!res.ok) console.warn('[vapi-webhook] sms failed', res);
      }),
    );
  } else {
    console.warn('[vapi-webhook] sms skipped: invalid French phone format', r.customerPhone);
  }

  await Promise.allSettled(tasks);
}

async function handleToolCall(
  call: VapiToolCall,
  callId: string | undefined,
): Promise<{ toolCallId: string; result: string }> {
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

  console.log('[vapi-webhook] reservation', { callId, ...validated.value });
  await deliverConfirmations(validated.value);
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
    const results = await Promise.all(calls.map((c) => handleToolCall(c, callId)));
    return NextResponse.json({ results });
  }

  console.log(`[vapi-webhook] event=${type} call=${callId ?? '-'}`);
  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'vapi-webhook' });
}
