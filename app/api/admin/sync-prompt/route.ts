import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import {
  CALLBOT_CONFIGS,
  buildPersonalizedPrompt,
  isSector,
} from '@/lib/callbot-configs';
import { getAssistant } from '@/lib/vapi-server';

/**
 * Push the latest prompt for the assistant's sector onto an already-deployed
 * Vapi assistant. Vapi snapshots model.systemPrompt at create time, so any
 * iteration on lib/callbot-configs.ts only reaches live bots if we PATCH
 * them.
 *
 * Body: { assistantId }
 *
 * We re-derive the prompt from CALLBOT_CONFIGS using the businessInfo we
 * stored in the assistant's metadata at deploy time (businessName, sector).
 * The enriched context is NOT re-injected because we don't have it persisted
 * here — operators who want to also refresh enriched context should
 * re-deploy via the wizard.
 */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.VAPI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'VAPI_API_KEY missing' }, { status: 503 });
  }

  let body: { assistantId?: string };
  try {
    body = await request.json();
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
    const existing = await getAssistant(body.assistantId);
    const meta = (existing.metadata as Record<string, unknown>) ?? {};
    const sectorRaw = typeof meta.sector === 'string' ? meta.sector : undefined;
    const businessName =
      typeof meta.businessName === 'string' && meta.businessName.trim()
        ? meta.businessName
        : existing.name?.split(' - ').pop() || 'votre établissement';

    if (!sectorRaw || !isSector(sectorRaw)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cet assistant n'a pas de secteur dans ses metadata. Resync impossible sans redéploiement depuis le wizard.",
        },
        { status: 400 },
      );
    }

    const config = CALLBOT_CONFIGS[sectorRaw];
    const systemPrompt = buildPersonalizedPrompt(config, { name: businessName }, undefined);

    const res = await fetch(`https://api.vapi.ai/assistant/${body.assistantId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Patch only the model.systemPrompt — we keep everything else
      // (voice, transcriber, tools, etc.) as the live assistant has them.
      body: JSON.stringify({
        model: {
          ...((existing as unknown as { model: object }).model ?? {}),
          systemPrompt,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Vapi PATCH ${res.status}: ${await res.text().catch(() => '')}`);
    }

    return NextResponse.json({ success: true, promptLength: systemPrompt.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
