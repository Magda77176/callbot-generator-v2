import { NextRequest, NextResponse } from 'next/server';
import { verifyVapiSecret } from '@/lib/verify-vapi-signature';
import { executeAction, resolveComposioUserId } from '@/lib/composio';

// Webhook hit by Vapi every time the bot invokes one of the custom calendar
// tools (check_calendar_availability or book_calendar_event). We use
// assistantId as the userId for Composio — the same identity passed during
// /api/composio/initiate when the operator clicked Connect.
//
// Vapi sends a {results} response back to the LLM, so whatever we put in
// `result` is what the bot "sees" before deciding what to say. We pass the
// raw Composio response as a JSON string — the LLM is capable of parsing it
// and the prompt already tells the bot how to handle the response shape.

interface VapiToolCall {
  id?: string;
  function?: { name?: string; arguments?: string | Record<string, unknown> };
}

interface VapiCallContext {
  id?: string;
  assistantId?: string;
  squadId?: string;
  assistant?: { id?: string; metadata?: Record<string, unknown> };
}

interface VapiMessage {
  type?: string;
  toolCallList?: VapiToolCall[];
  toolCalls?: VapiToolCall[];
  call?: VapiCallContext;
  // Vapi may also place these at top-level on some events (squad mode).
  assistantId?: string;
  squadId?: string;
  assistant?: { id?: string; metadata?: Record<string, unknown> };
}

interface VapiWebhookPayload {
  message?: VapiMessage;
}

export async function POST(req: NextRequest) {
  const expected = process.env.VAPI_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: 'VAPI_WEBHOOK_SECRET not configured' },
      { status: 503 },
    );
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

  if (type !== 'tool-calls') {
    // Status pings, transcripts, etc. — we don't care here.
    return NextResponse.json({ received: true });
  }

  // Extract the active assistant id from various paths Vapi may use. Single-
  // assistant mode puts it at message.call.assistantId. Squad mode sometimes
  // puts it at message.call.assistant.id or top-level. We fall back through.
  const assistantId =
    message?.call?.assistantId ??
    message?.call?.assistant?.id ??
    message?.assistantId ??
    message?.assistant?.id;

  if (!assistantId) {
    console.error('[tools/calendar] no assistantId in payload', JSON.stringify(payload).slice(0, 800));
    return NextResponse.json({ error: 'missing assistantId in webhook payload' }, { status: 400 });
  }

  // Resolve the Composio userId. For squad-deployed bots all members share
  // the same squadId stamped in metadata — we use that as the userId so a
  // single OAuth connection covers the whole squad. For single-assistant
  // deploys we fall back to the assistantId.
  const composioUserId = await resolveComposioUserId(assistantId);

  const calls = message?.toolCallList ?? message?.toolCalls ?? [];
  const results = await Promise.all(
    calls.map((c) => handleToolCall(c, composioUserId)),
  );
  return NextResponse.json({ results });
}

async function handleToolCall(
  call: VapiToolCall,
  assistantId: string,
): Promise<{ toolCallId: string; result: string }> {
  const toolCallId = call.id ?? 'unknown';
  const name = call.function?.name ?? '';

  // Vapi may serialise the arguments as a JSON string or as an object — handle both.
  let args: Record<string, unknown> = {};
  const raw = call.function?.arguments;
  if (typeof raw === 'string') {
    try {
      args = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { toolCallId, result: `Erreur: arguments JSON invalides pour ${name}` };
    }
  } else if (raw && typeof raw === 'object') {
    args = raw as Record<string, unknown>;
  }

  const composioAction = COMPOSIO_ACTION_BY_TOOL[name];
  if (!composioAction) {
    return { toolCallId, result: `Fonction inconnue: ${name}` };
  }

  try {
    // userId = assistantId so Composio routes to this tenant's connection.
    const result = await executeAction<unknown>(assistantId, composioAction, args);
    // The bot reads the result as a string. JSON.stringify is the cheapest
    // way to give the LLM all the response data without imposing a shape we
    // might get wrong.
    return { toolCallId, result: JSON.stringify(result, null, 2) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error(`[tools/calendar] ${name} failed for ${assistantId}:`, msg);
    return {
      toolCallId,
      // Bot will fall back to the "I can't access the calendar live, a
      // human will call back" branch in the prompt.
      result: `Erreur ${name}: ${msg}`,
    };
  }
}

// Map our Vapi tool names → Composio action slugs. New providers/tools added
// here as one-line entries.
const COMPOSIO_ACTION_BY_TOOL: Record<string, string> = {
  check_calendar_availability: 'GOOGLECALENDAR_FIND_FREE_SLOTS',
  book_calendar_event: 'GOOGLECALENDAR_CREATE_EVENT',
};

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'tools/calendar' });
}
