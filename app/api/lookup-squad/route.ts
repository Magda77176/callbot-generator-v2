import { NextResponse } from 'next/server';

// Public lookup endpoint: given a Vapi assistantId, return the squadId it
// belongs to (if any). Used by the /test/[id] page and other client-side
// callers that need to know whether to start a single-assistant call or a
// squad call.
//
// Only exposes the squadId — no other metadata leaks. The assistantId is
// already known to the caller (it's in their URL), so this is not a
// privilege escalation.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const assistantId = url.searchParams.get('assistantId');
  if (!assistantId) {
    return NextResponse.json({ error: 'assistantId required' }, { status: 400 });
  }

  const apiKey = process.env.VAPI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'VAPI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ squadId: null });
    }
    const data = (await res.json()) as { metadata?: Record<string, unknown> };
    const squadId =
      typeof data.metadata?.squadId === 'string' ? (data.metadata.squadId as string) : null;
    const squadRole =
      typeof data.metadata?.squadRole === 'string' ? (data.metadata.squadRole as string) : null;
    return NextResponse.json({ squadId, squadRole });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
