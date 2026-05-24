import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import {
  CALLBOT_CONFIGS,
  buildPersonalizedPrompt,
  isSector,
  type Sector,
} from '@/lib/callbot-configs';
import { getAssistant } from '@/lib/vapi-server';
import {
  buildToolsForSector,
  buildTranscriberConfig,
  createVapiTool,
} from '@/lib/vapi-tools';

/**
 * Older assistants — deployed before we started stamping sector in metadata
 * — can still be identified via their name (which our wizard builds as
 * `${persona} - ${businessName}`). Map persona → sector.
 */
const PERSONA_TO_SECTOR: Record<string, Sector> = {
  marco: 'restaurant',
  alex: 'immobilier',
  léa: 'coiffeur',
  lea: 'coiffeur',
  tom: 'dentaire',
  sophie: 'ecommerce',
};

function sectorFromName(name: string | undefined | null): Sector | null {
  if (!name) return null;
  const persona = name.split('-')[0].trim().toLowerCase();
  return PERSONA_TO_SECTOR[persona] ?? null;
}

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
    const metaSectorRaw = typeof meta.sector === 'string' ? meta.sector : undefined;

    // 1. Prefer the stamped metadata sector
    // 2. Fall back to parsing the assistant name (older assistants pre-4e947cf)
    let sector: Sector | null = null;
    if (metaSectorRaw && isSector(metaSectorRaw)) {
      sector = metaSectorRaw;
    } else {
      sector = sectorFromName(existing.name);
    }

    if (!sector) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de déduire le secteur (ni dans metadata, ni dans le nom de l'assistant). Redéploiement nécessaire.",
        },
        { status: 400 },
      );
    }

    const businessName =
      typeof meta.businessName === 'string' && meta.businessName.trim()
        ? meta.businessName
        : existing.name?.split('-').slice(1).join('-').trim() || 'votre établissement';

    const config = CALLBOT_CONFIGS[sector];
    const systemPrompt = buildPersonalizedPrompt(config, { name: businessName }, undefined);

    // Backfill missing metadata while we're at it so future syncs are clean.
    const mergedMetadata = {
      ...meta,
      sector,
      ...(typeof meta.businessName === 'string' ? {} : { businessName }),
    };

    // Preserve the operator-chosen voiceId from the deployed assistant, but
    // refresh ALL other voice/transcriber/speaking-plan tuning from our latest
    // defaults. This makes Resync push the full latest config (slower TTS,
    // updated stopSpeakingPlan, etc.) without forcing a redeploy from the
    // wizard.
    const existingVoiceId =
      (existing as unknown as { voice?: { voiceId?: string } }).voice?.voiceId;

    const voicePatch = {
      provider: 'cartesia' as const,
      voiceId: existingVoiceId,
      model: 'sonic-3',
      language: 'fr',
      experimentalControls: { speed: -0.2 },
      chunkPlan: {
        enabled: true,
        minCharacters: 60,
        punctuationBoundaries: ['.', '!', '?'],
      },
    };

    const startSpeakingPlan = {
      transcriptionEndpointingPlan: {
        onPunctuationSeconds: 0.1,
        onNoPunctuationSeconds: 1.5,
        onNumberSeconds: 0.5,
      },
      waitSeconds: 0.4,
    };

    const stopSpeakingPlan = {
      numWords: 2,
      voiceSeconds: 0.2,
      backoffSeconds: 1.0,
    };

    // Recreate all tools from the current source of truth (lib/vapi-tools.ts).
    // This is how we migrate Alex from the legacy Vapi-built-in calendar
    // tools (single-tenant Nango) to the custom Composio-backed ones
    // (per-tenant connections). Old tool IDs stay in Vapi's tool list
    // unreferenced — cleanup is a future concern.
    const webhookUrl = process.env.VAPI_WEBHOOK_URL?.trim();
    if (!webhookUrl) {
      throw new Error('VAPI_WEBHOOK_URL not configured');
    }
    const toolSpecs = buildToolsForSector(sector, webhookUrl);
    const toolIds = toolSpecs.length
      ? await Promise.all(toolSpecs.map((spec) => createVapiTool(spec, apiKey)))
      : [];

    const transcriber = buildTranscriberConfig(sector, { name: businessName });

    const res = await fetch(`https://api.vapi.ai/assistant/${body.assistantId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: {
          ...((existing as unknown as { model: object }).model ?? {}),
          systemPrompt,
          ...(toolIds.length > 0 ? { toolIds } : {}),
        },
        voice: voicePatch,
        transcriber,
        startSpeakingPlan,
        stopSpeakingPlan,
        metadata: mergedMetadata,
      }),
    });

    if (!res.ok) {
      throw new Error(`Vapi PATCH ${res.status}: ${await res.text().catch(() => '')}`);
    }

    return NextResponse.json({
      success: true,
      promptLength: systemPrompt.length,
      sector,
      voiceSpeedApplied: -0.2,
      toolIdsCreated: toolIds.length,
      backfilled: !metaSectorRaw,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
