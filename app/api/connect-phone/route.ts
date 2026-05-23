import { NextResponse } from 'next/server';
import {
  listAvailableNumbers,
  listFrenchDirections,
  orderNumber,
  setExternalSipUri,
} from '@/lib/zadarma';

interface ConnectPhoneBody {
  assistantId?: string;
  /**
   * Optional override of the Zadarma direction (region) id. If omitted we
   * pick the first FR direction returned by Zadarma.
   */
  directionId?: number;
}

interface VapiPhoneNumber {
  id: string;
  number: string;
  provider: string;
}

async function createVapiPhoneNumber(
  number: string,
  credentialId: string,
  assistantId: string,
  apiKey: string,
): Promise<VapiPhoneNumber> {
  const res = await fetch('https://api.vapi.ai/phone-number', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: 'byo-phone-number',
      name: `Bot ${assistantId.slice(0, 8)}`,
      number,
      numberE164CheckEnabled: false,
      credentialId,
      assistantId,
    }),
  });
  if (!res.ok) {
    throw new Error(`Vapi phone-number create failed: ${res.status} - ${await res.text()}`);
  }
  return (await res.json()) as VapiPhoneNumber;
}

export const maxDuration = 60;

export async function POST(request: Request) {
  // Required env checks before touching external APIs.
  const apiKey = process.env.VAPI_API_KEY?.trim();
  const credentialId = process.env.VAPI_ZADARMA_CREDENTIAL_ID?.trim();
  const zadarmaKey = process.env.ZADARMA_USER_KEY?.trim();
  const zadarmaSecret = process.env.ZADARMA_SECRET?.trim();

  if (!apiKey || !credentialId || !zadarmaKey || !zadarmaSecret) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Configuration incomplète. Env vars requis: VAPI_API_KEY, VAPI_ZADARMA_CREDENTIAL_ID, ZADARMA_USER_KEY, ZADARMA_SECRET',
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
    // 1. Resolve a French direction.
    let directionId = body.directionId;
    if (!directionId) {
      const directions = await listFrenchDirections();
      if (directions.length === 0) {
        throw new Error('Aucune direction française disponible chez Zadarma');
      }
      directionId = directions[0].id;
    }

    // 2. Find an available number in that direction.
    const availables = await listAvailableNumbers(directionId);
    if (availables.length === 0) {
      throw new Error(
        `Aucun numéro disponible chez Zadarma pour direction ${directionId}. Réessaye plus tard.`,
      );
    }
    const target = availables[0];

    // 3. Order it.
    const ordered = await orderNumber(target.id);
    const acquired = ordered.number ?? target.number;
    if (!acquired) {
      throw new Error('Zadarma a accepté la commande mais n\'a pas retourné de numéro');
    }
    const cleanNumber = acquired.replace(/^\+/, '');

    // 4. Point inbound calls at our Vapi SIP endpoint.
    const sipUri = `+${cleanNumber}@sip.vapi.ai`;
    await setExternalSipUri(cleanNumber, sipUri);

    // 5. Register the number with Vapi against our shared Zadarma credential
    //    and attach it to the assistant.
    const vapiPhone = await createVapiPhoneNumber(
      `+${cleanNumber}`,
      credentialId,
      body.assistantId,
      apiKey,
    );

    return NextResponse.json({
      success: true,
      phoneNumber: `+${cleanNumber}`,
      vapiPhoneNumberId: vapiPhone.id,
      directionId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    console.error('[connect-phone]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
