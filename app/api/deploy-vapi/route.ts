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
import { buildToolsForSector, createVapiTool } from '@/lib/vapi-tools';

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

// Common French regional proper nouns that Deepgram's baseline FR model
// frequently mis-transcribes. Boosting them via transcriber.keywords:
// - "Sainte-Luce" stays as "Sainte-Luce" instead of becoming "Saint-Russe"
// - "Schoelcher" doesn't get garbled
// - The agency name itself gets the strongest boost
//
// TODO: extract these dynamically from the enriched context / businessInfo.
// address once we serve agencies outside Martinique.
const MARTINIQUE_TOWNS = [
  'Schoelcher',
  'Sainte-Luce',
  'Sainte-Anne',
  'Le Diamant',
  'Fort-de-France',
  'Le Marin',
  'Case-Pilote',
  'Le Robert',
  'Le Morne-Rouge',
  'Saint-Pierre',
  'Terreville',
  'Ravine Vilaine',
  'Trinité',
  'Le Lamentin',
  'Ducos',
  'Rivière-Salée',
];

function buildTranscriberKeywords(sector: Sector, businessInfo: BusinessInfo): string[] {
  const keywords: string[] = [];
  // Strongest boost on the business name itself — it's what the bot says in
  // the greeting and what the caller might repeat back.
  if (businessInfo.name?.trim()) {
    keywords.push(`${businessInfo.name.trim()}:3`);
  }
  // Immobilier prospect is Martinique-based for now. Generalize when needed.
  if (sector === 'immobilier') {
    for (const town of MARTINIQUE_TOWNS) keywords.push(`${town}:2`);
  }
  return keywords;
}

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
}

interface DeployOverrides {
  systemPrompt?: string;
  model: ModelOption;
  temperature: number;
}

async function deployToVapi(
  config: CallbotConfig,
  businessInfo: BusinessInfo,
  voiceId: string,
  enrichedContext: string | undefined,
  overrides: DeployOverrides,
): Promise<VapiAssistantResponse> {
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
    name: `${config.name} - ${businessInfo.name || 'CallBot'}`,
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
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'fr',
      // Critical for phone-number reliability: numerals=true forces Deepgram
      // to emit "39" instead of "trente-neuf" (eliminates the phonetic
      // ambiguity between trente-et-un / trente-neuf etc). smartFormat
      // handles general number formatting. endpointing=300 leaves enough
      // silence for the speaker to finish digit sequences without being cut.
      numerals: true,
      smartFormat: true,
      endpointing: 300,
      // Keyword boost for proper nouns Deepgram's FR baseline often misses
      // (agency name + Martinique towns currently).
      keywords: buildTranscriberKeywords(config.sector, businessInfo),
    },
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
    //   - numWords 2 = user must say 2+ words to interrupt; protects from
    //     stray "oui"/"hmm" backchannel ("D'accord" alone won't interrupt)
    //     but allows real interjections like "non attendez", "stop arrête",
    //     "pardon je voulais dire"
    //   - voiceSeconds 0.2 = how long the user has to be speaking before
    //     we count their interruption
    //   - backoffSeconds 1.0 = wait 1s after being interrupted before
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
      numWords: 2,
      voiceSeconds: 0.2,
      backoffSeconds: 1.0,
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
