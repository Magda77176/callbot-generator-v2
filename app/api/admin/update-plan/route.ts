import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { isPlanId } from '@/lib/billing';
import { getAssistant } from '@/lib/vapi-server';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.VAPI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'VAPI_API_KEY missing' }, { status: 503 });
  }

  let body: { assistantId?: string; plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.assistantId || !isPlanId(body.plan)) {
    return NextResponse.json(
      { success: false, error: 'assistantId + valid plan requis' },
      { status: 400 },
    );
  }

  try {
    // Merge with existing metadata so we don't blow away unrelated keys.
    const existing = await getAssistant(body.assistantId);
    const nextMetadata = {
      ...((existing.metadata as Record<string, unknown>) ?? {}),
      plan: body.plan,
    };

    const res = await fetch(`https://api.vapi.ai/assistant/${body.assistantId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metadata: nextMetadata }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Vapi PATCH failed (${res.status}): ${text}`);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
