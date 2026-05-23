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

type LeadType = 'buyer' | 'renter' | 'seller' | 'estimation' | 'other';

const LEAD_TYPES: readonly LeadType[] = ['buyer', 'renter', 'seller', 'estimation', 'other'];

const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  buyer: 'Acheteur',
  renter: 'Locataire',
  seller: 'Vendeur',
  estimation: 'Demande d’estimation',
  other: 'Autre demande',
};

interface LeadArgs {
  leadType: LeadType;
  customerName: string;
  customerPhone: string;
  propertyType?: string;
  zones?: string;
  budget?: string;
  rooms?: number;
  timing?: string;
  mustHaves?: string;
  notes?: string;
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

function optionalRow(label: string, value?: string): string {
  return value && value.trim()
    ? `<p><strong>${label} :</strong> ${escapeHtml(value)}</p>`
    : '';
}

// ----------------------------- reservation -----------------------------

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

function buildReservationEmailHtml(r: ReservationArgs, businessName: string): string {
  return `<h2 style="margin:0 0 16px;">Nouvelle réservation — ${escapeHtml(businessName)}</h2>
<p><strong>Date :</strong> ${escapeHtml(formatFrenchDate(r.date))}</p>
<p><strong>Heure :</strong> ${escapeHtml(r.time)}</p>
<p><strong>Personnes :</strong> ${r.partySize}</p>
<p><strong>Client :</strong> ${escapeHtml(r.customerName)}</p>
<p><strong>Téléphone :</strong> ${escapeHtml(r.customerPhone)}</p>
${optionalRow('Régime / allergies', r.dietaryNotes)}
${optionalRow('Demandes particulières', r.specialRequests)}
<p style="color:#888;font-size:12px;margin-top:24px;">Reçu via Marco (callbot vocal).</p>`;
}

function buildReservationSmsContent(r: ReservationArgs, businessName: string): string {
  const firstName = r.customerName.trim().split(/\s+/)[0] ?? r.customerName;
  const niceTime = r.time.replace(':', 'h');
  return `Bonjour ${firstName}, votre résa au ${businessName} pour ${r.partySize} pers. le ${formatFrenchDate(r.date)} à ${niceTime} est confirmée. Merci !`;
}

async function deliverReservationConfirmations(r: ReservationArgs): Promise<void> {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  const businessName = process.env.BUSINESS_NAME || 'votre établissement';

  const tasks: Promise<unknown>[] = [];

  if (notificationEmail) {
    tasks.push(
      sendEmail({
        to: notificationEmail,
        subject: `Nouvelle résa — ${r.customerName} (${r.partySize} pers.)`,
        htmlBody: buildReservationEmailHtml(r, businessName),
      }).then((res) => {
        if (!res.ok) console.warn('[vapi-webhook] reservation email failed', res);
      }),
    );
  }

  const e164 = toE164French(r.customerPhone);
  if (e164) {
    tasks.push(
      sendSms({ to: e164, content: buildReservationSmsContent(r, businessName) }).then((res) => {
        if (!res.ok) console.warn('[vapi-webhook] reservation sms failed', res);
      }),
    );
  } else {
    console.warn('[vapi-webhook] reservation sms skipped: invalid French phone', r.customerPhone);
  }

  await Promise.allSettled(tasks);
}

// -------------------------------- lead --------------------------------

function isLeadType(value: unknown): value is LeadType {
  return typeof value === 'string' && (LEAD_TYPES as readonly string[]).includes(value);
}

function validateLead(
  args: Record<string, unknown>,
): { ok: true; value: LeadArgs } | { ok: false; error: string } {
  if (!isLeadType(args.leadType)) {
    return { ok: false, error: `leadType invalide (reçu: ${args.leadType})` };
  }
  const required = ['customerName', 'customerPhone'];
  const missing = required.filter((k) => !args[k] || String(args[k]).trim() === '');
  if (missing.length > 0) return { ok: false, error: `Champs manquants: ${missing.join(', ')}` };

  const roomsRaw = args.rooms;
  let rooms: number | undefined;
  if (roomsRaw !== undefined && roomsRaw !== null && roomsRaw !== '') {
    const n = Number(roomsRaw);
    if (Number.isInteger(n) && n >= 0) rooms = n;
  }

  const opt = (k: string) => {
    const v = args[k];
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s ? s : undefined;
  };

  return {
    ok: true,
    value: {
      leadType: args.leadType,
      customerName: String(args.customerName).trim(),
      customerPhone: String(args.customerPhone).trim(),
      propertyType: opt('propertyType'),
      zones: opt('zones'),
      budget: opt('budget'),
      rooms,
      timing: opt('timing'),
      mustHaves: opt('mustHaves'),
      notes: opt('notes'),
    },
  };
}

function buildLeadEmailHtml(l: LeadArgs, businessName: string): string {
  return `<h2 style="margin:0 0 16px;">Nouveau lead immo — ${escapeHtml(businessName)}</h2>
<p><strong>Type :</strong> ${escapeHtml(LEAD_TYPE_LABEL[l.leadType])}</p>
${optionalRow('Type de bien', l.propertyType)}
${optionalRow(l.leadType === 'seller' || l.leadType === 'estimation' ? 'Adresse du bien' : 'Zones recherchées', l.zones)}
${optionalRow('Budget', l.budget)}
${l.rooms !== undefined ? `<p><strong>Pièces :</strong> ${l.rooms}</p>` : ''}
${optionalRow('Timing', l.timing)}
${optionalRow('Critères', l.mustHaves)}
${optionalRow('Notes', l.notes)}
<p><strong>Contact :</strong> ${escapeHtml(l.customerName)}</p>
<p><strong>Téléphone :</strong> ${escapeHtml(l.customerPhone)}</p>
<p style="color:#888;font-size:12px;margin-top:24px;">Reçu via Alex (callbot vocal). À rappeler sous 24h.</p>`;
}

function buildLeadSmsContent(l: LeadArgs, businessName: string): string {
  const firstName = l.customerName.trim().split(/\s+/)[0] ?? l.customerName;
  return `Bonjour ${firstName}, votre demande a bien été enregistrée par ${businessName}. Un conseiller vous rappelle sous 24h. Merci.`;
}

function leadSubject(l: LeadArgs): string {
  const detail = l.budget ? ` — ${l.budget}` : '';
  return `Nouveau lead immo — ${l.customerName} (${LEAD_TYPE_LABEL[l.leadType].toLowerCase()})${detail}`;
}

async function deliverLeadConfirmations(l: LeadArgs): Promise<void> {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  const businessName = process.env.BUSINESS_NAME || 'notre agence';

  const tasks: Promise<unknown>[] = [];

  if (notificationEmail) {
    tasks.push(
      sendEmail({
        to: notificationEmail,
        subject: leadSubject(l),
        htmlBody: buildLeadEmailHtml(l, businessName),
      }).then((res) => {
        if (!res.ok) console.warn('[vapi-webhook] lead email failed', res);
      }),
    );
  }

  const e164 = toE164French(l.customerPhone);
  if (e164) {
    tasks.push(
      sendSms({ to: e164, content: buildLeadSmsContent(l, businessName) }).then((res) => {
        if (!res.ok) console.warn('[vapi-webhook] lead sms failed', res);
      }),
    );
  } else {
    console.warn('[vapi-webhook] lead sms skipped: invalid French phone', l.customerPhone);
  }

  await Promise.allSettled(tasks);
}

// ------------------------------ dispatch ------------------------------

async function handleToolCall(
  call: VapiToolCall,
  callId: string | undefined,
): Promise<{ toolCallId: string; result: string }> {
  const toolCallId = call.id ?? 'unknown';
  const name = call.function?.name;
  const parsed = parseArgs(call.function?.arguments);

  if (name === 'record_reservation') {
    const validated = validateReservation(parsed);
    if (!validated.ok) {
      console.warn(`[vapi-webhook] record_reservation rejected: ${validated.error}`, { callId, parsed });
      return { toolCallId, result: `Erreur d'enregistrement: ${validated.error}` };
    }
    console.log('[vapi-webhook] reservation', { callId, ...validated.value });
    await deliverReservationConfirmations(validated.value);
    return { toolCallId, result: 'Réservation enregistrée avec succès.' };
  }

  if (name === 'record_lead') {
    const validated = validateLead(parsed);
    if (!validated.ok) {
      console.warn(`[vapi-webhook] record_lead rejected: ${validated.error}`, { callId, parsed });
      return { toolCallId, result: `Erreur d'enregistrement: ${validated.error}` };
    }
    console.log('[vapi-webhook] lead', { callId, ...validated.value });
    await deliverLeadConfirmations(validated.value);
    return { toolCallId, result: 'Lead enregistré, un conseiller rappellera sous vingt-quatre heures.' };
  }

  return { toolCallId, result: `Fonction inconnue: ${name}` };
}

export async function POST(req: NextRequest) {
  // .trim() defends against pasted env vars with trailing whitespace/newline.
  // Vapi sends the header value as-is (HTTP strips control chars), so a stored
  // env value of "secret\n" would never match an incoming "secret" header.
  const expected = process.env.VAPI_WEBHOOK_SECRET?.trim();
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
