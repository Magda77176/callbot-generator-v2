import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/composio';

// Composio redirects here after the user approves the OAuth grant. The
// connection ID arrives as a query parameter (Composio uses ?status=&id=
// conventions). We verify the connection is active, then patch the assistant's
// metadata to remember which provider got connected to which Composio
// connection.
//
// NOTE: Composio's exact callback query param naming may vary. The current
// pattern uses ?status=success&id=<connectedAccountId>&userId=<assistantId>&provider=<slug>.
// We forward the user back to /admin/assistants/[assistantId] with a banner.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const connectionId = url.searchParams.get('id') || url.searchParams.get('connectionId');
  const assistantId = url.searchParams.get('userId') || url.searchParams.get('assistantId');
  const provider = url.searchParams.get('provider') || 'google_calendar';

  const baseRedirect = assistantId
    ? `/admin/assistants/${assistantId}`
    : '/admin/assistants';

  if (status !== 'success' || !connectionId || !assistantId) {
    return NextResponse.redirect(
      new URL(`${baseRedirect}?connect_status=error&provider=${provider}`, request.url),
    );
  }

  try {
    // Verify the connection is ACTIVE on Composio's side
    const conn = await getConnection(connectionId);
    const connStatus = (conn as { status?: string }).status;
    if (connStatus !== 'ACTIVE') {
      return NextResponse.redirect(
        new URL(
          `${baseRedirect}?connect_status=pending&provider=${provider}`,
          request.url,
        ),
      );
    }

    // Patch the Vapi assistant metadata so the bot's webhook routes know which
    // Composio connection to use for this provider.
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
      body: JSON.stringify({
        metadata: { ...meta, connections },
      }),
    });
    if (!patchRes.ok) {
      throw new Error(`Vapi PATCH ${patchRes.status}`);
    }

    return NextResponse.redirect(
      new URL(`${baseRedirect}?connect_status=success&provider=${provider}`, request.url),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('[composio/callback]', msg);
    return NextResponse.redirect(
      new URL(
        `${baseRedirect}?connect_status=error&provider=${provider}&reason=${encodeURIComponent(msg)}`,
        request.url,
      ),
    );
  }
}
