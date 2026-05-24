import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { initiateConnection, PROVIDERS } from '@/lib/composio';

// Body: { assistantId: string, provider: 'google_calendar' | ... }
// Returns: { redirectUrl, connectionRequestId } — the operator's browser opens
// redirectUrl in a new tab so the client (or operator on their behalf) can
// approve the OAuth grant. After approval Composio redirects to our /callback
// route which stamps the resulting connectionId onto the assistant's metadata.
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
    // userId = assistantId so future tool calls can fetch the right connection.
    // We build the callbackUrl with assistantId + provider encoded — the
    // callback route uses these to know which Vapi assistant to patch.
    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/api/composio/callback?assistantId=${encodeURIComponent(
      assistantId,
    )}&provider=${encodeURIComponent(provider)}`;
    const res = await initiateConnection(assistantId, provider, callbackUrl);
    return NextResponse.json({ success: true, ...res });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
