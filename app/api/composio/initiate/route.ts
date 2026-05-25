import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import {
  findActiveConnection,
  initiateConnection,
  PROVIDERS,
  resolveComposioUserId,
} from '@/lib/composio';

// Body: { assistantId: string, provider: 'google_calendar' | ... }
// Returns one of:
//   { success: true, alreadyConnected: true }   → connection existed, we
//     stamped it on Vapi metadata. Frontend should refresh the page.
//   { success: true, redirectUrl, connectionRequestId } → frontend opens
//     redirectUrl in a new tab to start OAuth.
//   { success: false, error: string } → something failed
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { assistantId?: string; provider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { assistantId, provider } = body;
  if (!assistantId || !provider) {
    return NextResponse.json(
      { success: false, error: 'assistantId and provider are required' },
      { status: 400 },
    );
  }
  if (!PROVIDERS[provider]) {
    return NextResponse.json(
      { success: false, error: `Unknown provider: ${provider}` },
      { status: 400 },
    );
  }

  try {
    // Squad-aware: if this assistant belongs to a squad, use squadId as the
    // Composio userId so all members share one connection. Otherwise the
    // assistantId itself.
    const composioUserId = await resolveComposioUserId(assistantId);

    // If a connection is already active on Composio for this userId +
    // toolkit, we don't re-run OAuth — we just stamp it on Vapi metadata.
    const existing = await findActiveConnection(composioUserId, provider);
    if (existing) {
      await patchVapiConnection(assistantId, provider, existing.id);
      return NextResponse.json({ success: true, alreadyConnected: true });
    }

    // No existing connection → start fresh OAuth. callbackUrl carries
    // assistantId + provider so the callback route knows what to patch.
    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/api/composio/callback?assistantId=${encodeURIComponent(
      assistantId,
    )}&provider=${encodeURIComponent(provider)}`;
    const res = await initiateConnection(composioUserId, provider, callbackUrl);
    return NextResponse.json({ success: true, ...res });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

async function patchVapiConnection(
  assistantId: string,
  provider: string,
  connectionId: string,
): Promise<void> {
  const apiKey = process.env.VAPI_API_KEY?.trim();
  if (!apiKey) throw new Error('VAPI_API_KEY not configured');

  const existingRes = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (!existingRes.ok) {
    throw new Error(`Vapi GET ${existingRes.status}`);
  }
  const existing = (await existingRes.json()) as { metadata?: Record<string, unknown> };
  const meta = existing.metadata ?? {};
  const connections = (meta.connections as Record<string, string>) ?? {};
  connections[provider] = connectionId;

  const patchRes = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metadata: { ...meta, connections } }),
  });
  if (!patchRes.ok) {
    throw new Error(`Vapi PATCH ${patchRes.status}: ${await patchRes.text().catch(() => '')}`);
  }
}
