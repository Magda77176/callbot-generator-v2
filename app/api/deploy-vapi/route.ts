import { NextResponse } from 'next/server';
import {
  CALLBOT_CONFIGS,
  buildPersonalizedPrompt,
  isSector,
  type BusinessInfo,
  type CallbotConfig,
  type Sector,
} from '@/lib/callbot-configs';
import type { ModelOption } from '@/lib/builder-types';
import { DEFAULT_VOICE_BY_PERSONA } from '@/lib/voices';
import { checkLimit, clientIp, deployLimiter, rateLimitHeaders } from '@/lib/rate-limit';
import {
  buildToolSpecByName,
  buildToolsCalendarUrl,
  buildToolsForSector,
  buildTranscriberConfig,
  createHandoffTool,
  createSquad,
  createVapiTool,
} from '@/lib/vapi-tools';
import { getSquad, type SquadRole } from '@/lib/callbot-squads';

const END_CALL_PHRASES = ['au revoir', 'bonne soirée', 'bonne journée'];
const DEFAULT_MODEL: ModelOption = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.3;

const MODEL_OPTIONS: readonly ModelOption[] = [
  'gpt-4o-mini',
  'gpt-4o',
  'claude-sonnet-4-6',
] as const;

function isModelOption(value: unknown): value is ModelOption {
  return typeof value === 'string' && (MODEL_OPTIONS as readonly string[]).includes(value);
}

// Maps the wizard's ModelOption to the {provider, model} pair Vapi expects.
function vapiModelConfig(option: ModelOption): { provider: string; model: string } {
  switch (option) {
    case 'gpt-4o-mini':
      return { provider: 'openai', model: 'gpt-4o-mini' };
    case 'gpt-4o':
      return { provider: 'openai', model: 'gpt-4o' };
    case 'claude-sonnet-4-6':
      return { provider: 'anthropic', model: 'claude-sonnet-4-5' };
  }
}

// Transcriber config + keyword builder live in lib/vapi-tools.ts —
// imported as buildTranscriberConfig above.

// Tool specs + createVapiTool now live in lib/vapi-tools.ts so deploy and
// sync-prompt share the same source of truth.

interface DeployRequestBody {
  sector?: string;
  businessInfo?: BusinessInfo;
  voiceId?: string;
  enrichedContext?: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
}

interface VapiAssistantResponse {
  id: string;
  phoneNumber?: string;
  /** Set when the persona was deployed as a Vapi squad (multi-assistant). */
  squadId?: string;
  /** Set when the persona was deployed as a squad — first member's name. */
  mode?: 'single' | 'squad';
}

interface DeployOverrides {
  systemPrompt?: string;
  model: ModelOption;
  temperature: number;
}

/**
 * Vapi enforces a 40-character limit on assistant `name` and squad `name`.
 * Truncate the business name portion to fit. We keep the role prefix intact
 * because it's the operator-meaningful part (Qualifier vs Booker etc.).
 */
function fitVapiName(prefix: string, businessName: string): string {
  const MAX = 40;
  const sep = ' - ';
  const full = `${prefix}${sep}${businessName}`;
  if (full.length <= MAX) return full;
  const allowedBiz = MAX - prefix.length - sep.length;
  if (allowedBiz <= 0) {
    // Pathological case (prefix alone >= 40 chars). Just truncate the whole thing.
    return full.slice(0, MAX);
  }
  return `${prefix}${sep}${businessName.slice(0, allowedBiz)}`;
}

/**
 * Squad-mode deploy. Creates N specialised assistants (qualifier, proposer,
 * booker, closer for Alex) plus the handoff tools between them, then wraps
 * them in a Vapi squad via POST /squad. Returns the squadId and the first
 * member's assistantId for backward compat.
 *
 * Order matters: we create deepest-first (closer → booker → proposer →
 * qualifier) so each upstream member has its downstream targets' ids when
 * we build its handoff tools.
 */
async function deploySquadToVapi(
  squad: import('@/lib/callbot-squads').SquadConfig,
  businessInfo: BusinessInfo,
  voiceId: string,
  enrichedContext: string | undefined,
  overrides: DeployOverrides,
  apiKey: string,
): Promise<VapiAssistantResponse> {
  const webhookUrl = process.env.VAPI_WEBHOOK_URL?.trim();
  if (!webhookUrl) throw new Error('VAPI_WEBHOOK_URL not configured');
  const toolsCalendarUrl = buildToolsCalendarUrl();
  const businessName = businessInfo.name || 'notre établissement';
  const today = new Date().toISOString().slice(0, 10);

  // Deploy order: deepest first so handoff sources have target ids
  const orderedRoles: SquadRole[] = ['closer', 'booker', 'proposer', 'qualifier'];
  const memberByRole = new Map(squad.members.map((m) => [m.role, m]));
  const assistantIdByRole: Partial<Record<SquadRole, string>> = {};

  for (const role of orderedRoles) {
    const m = memberByRole.get(role);
    if (!m) continue;

    // 1. Business tools (record_lead, calendar, etc.)
    const businessSpecs = m.toolNames
      .map((n) => buildToolSpecByName(n, webhookUrl, toolsCalendarUrl))
      .filter((s): s is NonNullable<typeof s> => s !== null);
    const businessToolIds = await Promise.all(
      businessSpecs.map((s) => createVapiTool(s, apiKey)),
    );

    // 2. Handoff tools (one per downstream destination)
    const handoffToolIds: string[] = [];
    for (const h of m.handoffs) {
      const targetId = assistantIdByRole[h.toRole];
      if (!targetId) {
        throw new Error(
          `Squad deploy order bug: ${role} needs handoff to ${h.toRole} but target not yet created`,
        );
      }
      const id = await createHandoffTool(
        `handoff_to_${h.toRole}`,
        h.when,
        targetId,
        apiKey,
      );
      handoffToolIds.push(id);
    }

    const toolIds = [...businessToolIds, ...handoffToolIds];

    // 3. Build the system prompt. Proposer is the only member that gets the
    //    portfolio context (CONTEXTE BUSINESS RÉEL) — other members can read
    //    the result through the preserved transcript.
    let systemPrompt = m.systemPrompt.replace(/\{\{business_name\}\}/g, businessName);
    if (role === 'proposer' && enrichedContext?.trim()) {
      systemPrompt +=
        '\n\n══════════════\nCONTEXTE BUSINESS RÉEL\n══════════════\n\n' + enrichedContext.trim();
    }

    // 4. Build the assistant payload. Shared voice / transcriber / speech
    //    pipeline across all members so the call sounds coherent.
    const payload: Record<string, unknown> = {
      name: fitVapiName(m.name, businessName),
      ...(m.greeting
        ? { firstMessage: m.greeting.replace(/\{\{business_name\}\}/g, businessName) }
        : {}),
      metadata: {
        plan: 'starter',
        planStartDate: today,
        businessName: businessInfo.name?.trim() || '',
        sector: squad.sector,
        squadRole: role,
        contactEmail: process.env.NOTIFICATION_EMAIL?.trim() || '',
      },
      model: {
        ...vapiModelConfig(overrides.model),
        temperature: overrides.temperature,
        maxTokens: 200,
        systemPrompt,
        ...(toolIds.length > 0 ? { toolIds } : {}),
      },
      voice: {
        provider: 'cartesia',
        voiceId,
        model: 'sonic-3',
        language: 'fr',
        experimentalControls: { speed: -0.2 },
        chunkPlan: {
          enabled: true,
          minCharacters: 60,
          punctuationBoundaries: ['.', '!', '?'],
        },
      },
      transcriber: buildTranscriberConfig(squad.sector, businessInfo),
      server: { url: webhookUrl, secret: process.env.VAPI_WEBHOOK_SECRET?.trim() },
      backchannelingEnabled: true,
      backgroundDenoisingEnabled: true,
      startSpeakingPlan: {
        transcriptionEndpointingPlan: {
          onPunctuationSeconds: 0.1,
          onNoPunctuationSeconds: 1.5,
          onNumberSeconds: 0.5,
        },
        waitSeconds: 0.4,
      },
      stopSpeakingPlan: {
        numWords: 1,
        voiceSeconds: 0.3,
        backoffSeconds: 0.5,
      },
      endCallPhrases: END_CALL_PHRASES,
      silenceTimeoutSeconds: 20,
      responseDelaySeconds: 0.4,
    };

    const res = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(
        `Vapi assistant create failed for squad member ${role}: ${res.status} - ${await res.text()}`,
      );
    }
    const data = (await res.json()) as { id: string };
    assistantIdByRole[role] = data.id;
  }

  // 5. Create the squad referencing all members in original order (first =
  //    starting assistant = the qualifier). Non-starter members get a
  //    handoffGreeting that Vapi speaks immediately on transfer, filling
  //    the 1-2s latency so the caller doesn't hear silence.
  const orderedMemberIds = squad.members
    .map((m) => assistantIdByRole[m.role])
    .filter((id): id is string => Boolean(id));
  const handoffGreetings: Record<string, string> = {};
  for (const m of squad.members) {
    const id = assistantIdByRole[m.role];
    if (id && m.handoffGreeting) {
      handoffGreetings[id] = m.handoffGreeting;
    }
  }
  const squadId = await createSquad(
    fitVapiName(squad.nameTemplate, businessName),
    orderedMemberIds,
    apiKey,
    handoffGreetings,
  );

  // 6. Best-effort backfill of squadId into each member's metadata so admin
  //    pages can group them. Non-fatal if any patch fails.
  await Promise.allSettled(
    Object.entries(assistantIdByRole).map(async ([, id]) => {
      const get = await fetch(`https://api.vapi.ai/assistant/${id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      });
      if (!get.ok) return;
      const existing = (await get.json()) as { metadata?: Record<string, unknown> };
      const meta = { ...(existing.metadata ?? {}), squadId };
      await fetch(`https://api.vapi.ai/assistant/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: meta }),
      });
    }),
  );

  // The qualifier (squad.members[0]) is the starting assistant — return its id
  // so the wizard's success screen / test page can use it for the first call.
  return {
    id: assistantIdByRole.qualifier ?? orderedMemberIds[0],
    squadId,
    mode: 'squad',
  };
}

async function deployToVapi(
  config: CallbotConfig,
  businessInfo: BusinessInfo,
  voiceId: string,
  enrichedContext: string | undefined,
  overrides: DeployOverrides,
): Promise<VapiAssistantResponse> {
  // If a Squad definition exists for this sector, deploy in squad mode.
  // Currently only `immobilier` has a squad — others remain single-assistant.
  const squad = getSquad(config.sector);
  if (squad) {
    const apiKey = process.env.VAPI_API_KEY?.trim() ?? '';
    return deploySquadToVapi(squad, businessInfo, voiceId, enrichedContext, overrides, apiKey);
  }

  const businessName = businessInfo.name || 'notre établissement';
  // Always go through buildPersonalizedPrompt so the CONTEXTE BUSINESS RÉEL +
  // INFORMATIONS ÉTABLISSEMENT blocks wrap the prompt. Pass overrides.systemPrompt
  // as the base — that respects user edits from the wizard while still attaching
  // the enriched listings/menu data the bot needs to function.
  const systemPrompt = buildPersonalizedPrompt(
    config,
    businessInfo,
    enrichedContext,
    overrides.systemPrompt,
  ).replace(/\{\{business_name\}\}/g, businessName);

  // .trim() guards against accidental trailing whitespace/newline when the env var
  // is pasted into the Vercel dashboard. Vapi rejects URLs with any control chars.
  const webhookUrl = process.env.VAPI_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    throw new Error(
      'VAPI_WEBHOOK_URL not configured — set it to your deployed /api/vapi-webhook URL',
    );
  }
  console.log('[deploy-vapi] using webhookUrl=', webhookUrl);
  const apiKey = process.env.VAPI_API_KEY?.trim() ?? '';
  const toolSpecs = buildToolsForSector(config.sector, webhookUrl);

  // Each tool must be created as a standalone resource on Vapi first; the
  // assistant then references them via model.toolIds. Yes, this means a fresh
  // tool record per deploy — cleanup is a future concern, parity with one
  // prospect first.
  const dynamicToolIds = toolSpecs.length
    ? await Promise.all(toolSpecs.map((spec) => createVapiTool(spec, apiKey)))
    : [];

  // The legacy Vapi-built-in calendar tools (VAPI_TOOL_AVAILABILITY_ID /
  // VAPI_TOOL_EVENT_ID) are intentionally NOT pulled here anymore — they're
  // single-tenant, scoped to the operator's Nango connection in the Vapi
  // dashboard, and incompatible with our multi-tenant Composio model. We now
  // create check_calendar_availability + book_calendar_event as custom tools
  // (see buildToolsForSector) whose serverUrl routes to /api/tools/calendar
  // and uses the assistant's own Composio connection.
  const toolIds = dynamicToolIds;

  // Stamp the assistant with the operator-side metadata we need later for
  // billing and back-office display. The plan defaults to Starter; the
  // operator can change it from /admin/assistants/[id].
  const today = new Date().toISOString().slice(0, 10);
  const assistantMetadata: Record<string, string> = {
    plan: 'starter',
    planStartDate: today,
    businessName: businessInfo.name?.trim() || '',
    sector: config.sector,
    contactEmail: process.env.NOTIFICATION_EMAIL?.trim() || '',
  };

  const payload = {
    name: fitVapiName(config.name, businessInfo.name || 'CallBot'),
    firstMessage: config.greeting.replace(/\{\{business_name\}\}/g, businessName),
    metadata: assistantMetadata,
    model: {
      ...vapiModelConfig(overrides.model),
      temperature: overrides.temperature,
      maxTokens: 200,
      systemPrompt,
      ...(toolIds.length > 0 ? { toolIds } : {}),
    },
    voice: {
      provider: 'cartesia',
      voiceId,
      model: 'sonic-3',
      language: 'fr',
      // Slow Cartesia down ~20% via experimentalControls.speed (range -1..1).
      // User feedback: "parle vite, pas d'intonation, pas de ponctuation".
      // At default speed (1.0), Cartesia rushes through commas. At -0.2 the
      // pacing matches what a French phone agent actually sounds like and
      // commas get their natural audible pause.
      experimentalControls: {
        speed: -0.2,
      },
      // Larger chunks (60 chars vs default ~30) and sentence-end boundaries
      // only prevent the "phrases hachées" pattern where TTS cuts mid-clause.
      chunkPlan: {
        enabled: true,
        minCharacters: 60,
        punctuationBoundaries: ['.', '!', '?'],
      },
    },
    transcriber: buildTranscriberConfig(config.sector, businessInfo),
    server: {
      url: webhookUrl,
      secret: process.env.VAPI_WEBHOOK_SECRET?.trim(),
    },
    backchannelingEnabled: true,
    backgroundDenoisingEnabled: true,
    // Modern Vapi speech pipeline config (replaces legacy
    // numWordsToInterruptAssistant). French-tuned per Vapi's docs.
    //
    // startSpeakingPlan.transcriptionEndpointingPlan: when does Vapi consider
    // the user finished talking and trigger the LLM?
    //   - onPunctuationSeconds 0.1 = user ended with . or ? → react fast
    //   - onNoPunctuationSeconds 1.5 = mid-sentence pause → wait longer
    //   - onNumberSeconds 0.5 = pauses between digits (phone numbers)
    //
    // stopSpeakingPlan: when does the bot SHUT UP because the user is talking?
    //   - numWords 1 = a single word ("non", "stop", "attendez") is enough
    //     to interrupt. Previously 2, which felt unresponsive: user said
    //     "non" and the bot kept monologuing.
    //   - voiceSeconds 0.3 = user must be speaking for 300ms before we
    //     count their interruption. Filters out ~200ms backchannel like
    //     "hmm" but lets real interjections through ("non" ≈ 300ms,
    //     "stop" ≈ 400ms, "attendez" ≈ 500ms).
    //   - backoffSeconds 0.5 = wait 0.5s after being interrupted before
    //     starting to talk again
    startSpeakingPlan: {
      transcriptionEndpointingPlan: {
        onPunctuationSeconds: 0.1,
        onNoPunctuationSeconds: 1.5,
        onNumberSeconds: 0.5,
      },
      waitSeconds: 0.4,
    },
    stopSpeakingPlan: {
      numWords: 1,
      voiceSeconds: 0.3,
      backoffSeconds: 0.5,
    },
    endCallPhrases: END_CALL_PHRASES,
    silenceTimeoutSeconds: 20,
    responseDelaySeconds: 0.4,
  };

  const response = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vapi API error: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as VapiAssistantResponse;
}

export async function POST(request: Request) {
  if (!process.env.VAPI_API_KEY?.trim() || !process.env.VAPI_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json(
      { success: false, error: 'Configuration serveur incomplète (env vars manquantes)' },
      { status: 503 },
    );
  }

  const decision = await checkLimit(deployLimiter, clientIp(request));
  if (!decision.allowed) {
    return NextResponse.json(
      { success: false, error: 'Trop de déploiements. Réessaie dans quelques minutes.' },
      { status: 429, headers: rateLimitHeaders(decision) },
    );
  }

  try {
    const body = (await request.json()) as DeployRequestBody;
    const { sector, businessInfo, voiceId, enrichedContext, systemPrompt, model, temperature } =
      body;

    if (!sector || !isSector(sector)) {
      return NextResponse.json(
        {
          success: false,
          error: `Secteur '${sector}' non supporté. Secteurs disponibles: ${Object.keys(CALLBOT_CONFIGS).join(', ')}`,
        },
        { status: 400 },
      );
    }

    const resolvedModel: ModelOption = isModelOption(model) ? model : DEFAULT_MODEL;
    const resolvedTemperature =
      typeof temperature === 'number' && temperature >= 0 && temperature <= 1
        ? temperature
        : DEFAULT_TEMPERATURE;

    const config = CALLBOT_CONFIGS[sector];
    const resolvedVoiceId = voiceId || DEFAULT_VOICE_BY_PERSONA[sector];
    const result = await deployToVapi(config, businessInfo || {}, resolvedVoiceId, enrichedContext, {
      systemPrompt,
      model: resolvedModel,
      temperature: resolvedTemperature,
    });

    return NextResponse.json(
      {
        success: true,
        assistantId: result.id,
        squadId: result.squadId,
        mode: result.mode ?? 'single',
        phoneNumber: result.phoneNumber || "En cours d'attribution...",
        sector,
        assistantName: config.name,
        businessName: businessInfo?.name || 'Non défini',
      },
      { headers: rateLimitHeaders(decision) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ Erreur déploiement Vapi:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
