import { NextRequest, NextResponse } from 'next/server';
import { verifyVapiSecret } from '@/lib/verify-vapi-signature';

interface VapiWebhookMessage {
  type?: string;
  call?: { id?: string; status?: string };
  [k: string]: unknown;
}

interface VapiWebhookPayload {
  message?: VapiWebhookMessage;
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

  const type = payload.message?.type ?? 'unknown';
  console.log(`[vapi-webhook] event=${type} call=${payload.message?.call?.id ?? '-'}`);

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'vapi-webhook' });
}
