import { NextResponse } from 'next/server';
import { findActiveConnection } from '@/lib/composio';

// Composio redirects here after the user approves the OAuth grant. Our
// /initiate route encodes assistantId + provider in the callbackUrl, so we
// can read them back here directly. We then list the user's active
// connections on Composio's side to discover the new connectionId (Composio
// doesn't reliably append it to the callback URL).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const assistantId = url.searchParams.get('assistantId');
  const provider = url.searchParams.get('provider') || 'google_calendar';

  const baseRedirect = assistantId
    ? `/admin/assistants/${assistantId}`
    : '/admin/assistants';

  if (!assistantId) {
    return NextResponse.redirect(
      new URL(`${baseRedirect}?connect_status=error&provider=${provider}&reason=missing_assistantId`, request.url),
    );
  }

  try {
    // Discover the connection that Composio just created for this user+toolkit.
    // We may need a tiny retry loop if Composio hasn't fully written the row
    // when it redirects us — usually it has, but we tolerate eventual
    // consistency.
    let conn = await findActiveConnection(assistantId, provider);
    if (!conn) {
      await new Promise((r) => setTimeout(r, 1000));
      conn = await findActiveConnection(assistantId, provider);
    }
    if (!conn) {
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
    connections[provider] = conn.id;

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
