import { NextResponse } from 'next/server';
import {
  assignConnection,
  findPhoneNumber,
  listAvailableFrenchNumbers,
  orderNumber,
  setVoiceTranslatedNumber,
} from '@/lib/telnyx';

interface ConnectPhoneBody {
  assistantId?: string;
}

interface VapiSipPhoneNumber {
  id: string;
  sipUri: string;
}

/**
 * Create a Vapi phone-number with provider="vapi" and a custom SIP URI. This
 * URI is what we'll tell Telnyx to translate the inbound INVITE to, so
 * Telnyx delivers the call to Vapi which then routes to the right assistant.
 */
async function createVapiSipNumber(
  sipUri: string,
  assistantId: string,
  apiKey: string,
): Promise<VapiSipPhoneNumber> {
  const res = await fetch('https://api.vapi.ai/phone-number', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: 'vapi',
      sipUri,
      assistantId,
      name: `Bot ${assistantId.slice(0, 8)}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Vapi phone-number create failed: ${res.status} - ${await res.text()}`);
  }
  return (await res.json()) as VapiSipPhoneNumber;
}

function sanitiseAssistantId(assistantId: string): string {
  // SIP URI user part needs to be alphanumeric-ish. Strip non-safe chars and
  // lowercase. Assistant IDs are UUIDs so this is mostly a defensive trim.
  return assistantId.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 24);
}

export const maxDuration = 60;

export async function POST(request: Request) {
  const vapiKey = process.env.VAPI_API_KEY?.trim();
  const telnyxKey = process.env.TELNYX_API_KEY?.trim();
  const connectionId = process.env.TELNYX_CONNECTION_ID?.trim();

  if (!vapiKey || !telnyxKey || !connectionId) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Configuration incomplète. Env vars requis: VAPI_API_KEY, TELNYX_API_KEY, TELNYX_CONNECTION_ID',
      },
      { status: 503 },
    );
  }

  let body: ConnectPhoneBody;
  try {
    body = (await request.json()) as ConnectPhoneBody;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.assistantId) {
    return NextResponse.json(
      { success: false, error: 'assistantId requis' },
      { status: 400 },
    );
  }

  try {
    // 1. Vapi: create a SIP phone-number for this assistant. The unique part of
    //    the SIP URI is derived from the assistantId so collisions are impossible.
    const sipUser = `bot-${sanitiseAssistantId(body.assistantId)}`;
    const sipUri = `sip:${sipUser}@sip.vapi.ai`;
    const vapiSip = await createVapiSipNumber(sipUri, body.assistantId, vapiKey);

    // 2. Telnyx: find an available French number and order it.
    const available = await listAvailableFrenchNumbers(5);
    if (available.length === 0) {
      throw new Error('Aucun numéro français disponible chez Telnyx en ce moment');
    }
    const target = available[0].phone_number;
    const order = await orderNumber(target);

    if (order.status === 'failure') {
      throw new Error(`Telnyx a refusé la commande du numéro ${target}`);
    }

    // 3. Telnyx returns the number-orders entry. The actual phone-number
    //    resource is created async — usually fast, but we poll briefly to
    //    grab its id before patching it.
    let phoneNumber = await findPhoneNumber(target);
    for (let i = 0; i < 8 && !phoneNumber; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      phoneNumber = await findPhoneNumber(target);
    }
    if (!phoneNumber) {
      throw new Error(
        `Numéro ${target} commandé mais pas encore activé. Patiente quelques minutes et réessaye.`,
      );
    }

    // 4. Telnyx: route this number through our pre-configured SIP connection
    //    (which points to sip.vapi.ai). Then rewrite the SIP INVITE to land
    //    on the assistant-specific Vapi SIP URI.
    await assignConnection(phoneNumber.id, connectionId);
    await setVoiceTranslatedNumber(phoneNumber.id, sipUri);

    return NextResponse.json({
      success: true,
      phoneNumber: target,
      vapiPhoneNumberId: vapiSip.id,
      sipUri,
      telnyxPhoneNumberId: phoneNumber.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    console.error('[connect-phone]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
