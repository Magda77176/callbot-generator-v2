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

function reservationToolSpec(webhookUrl: string) {
  return {
    type: 'function',
    function: {
      name: 'record_reservation',
      description:
        "Enregistre une réservation confirmée par le client. À appeler UNIQUEMENT après que tous les champs ont été reconfirmés à voix haute. C'est cet appel qui sauvegarde la réservation côté restaurateur — tant qu'il n'a pas eu lieu, la réservation n'existe pas.",
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date de la réservation au format ISO AAAA-MM-JJ (ex. 2026-05-25)',
          },
          time: {
            type: 'string',
            description:
              "Heure de la réservation au format 24h HH:MM (ex. 19:30 pour sept heures et demie du soir)",
          },
          partySize: {
            type: 'integer',
            description: 'Nombre de personnes (entier ≥ 1)',
            minimum: 1,
          },
          customerName: {
            type: 'string',
            description: 'Nom du client tel que reconfirmé à voix haute',
          },
          customerPhone: {
            type: 'string',
            description: 'Numéro français à 10 chiffres formaté "06 12 34 56 78"',
          },
          dietaryNotes: {
            type: 'string',
            description: 'Allergies, régimes spéciaux mentionnés. Chaîne vide si rien.',
          },
          specialRequests: {
            type: 'string',
            description:
              'Demandes particulières (anniversaire, table fenêtre, accès PMR…). Chaîne vide si rien.',
          },
        },
        required: ['date', 'time', 'partySize', 'customerName', 'customerPhone'],
      },
    },
    server: { url: webhookUrl, secret: process.env.VAPI_WEBHOOK_SECRET?.trim() },
  };
}

function leadToolSpec(webhookUrl: string) {
  return {
    type: 'function',
    function: {
      name: 'record_lead',
      description:
        "Enregistre un lead immobilier qualifié. À appeler UNIQUEMENT après collecte des infos qualifiantes et reconfirmation orale du nom et du téléphone. C'est cet appel qui transmet le lead à l'agence pour rappel.",
      parameters: {
        type: 'object',
        properties: {
          leadType: {
            type: 'string',
            enum: ['buyer', 'renter', 'seller', 'estimation', 'other'],
            description:
              "Catégorie : buyer=acheteur, renter=locataire, seller=vendeur, estimation=demande d'estimation, other=autre",
          },
          customerName: {
            type: 'string',
            description: 'Nom complet du contact tel que reconfirmé à voix haute',
          },
          customerPhone: {
            type: 'string',
            description: 'Numéro français à 10 chiffres formaté "06 12 34 56 78"',
          },
          propertyType: {
            type: 'string',
            description: 'Type de bien (appartement, maison, terrain, local). Vide si non pertinent.',
          },
          zones: {
            type: 'string',
            description:
              'Zones recherchées (acheteur/locataire) OU adresse précise du bien (vendeur/estimation)',
          },
          budget: {
            type: 'string',
            description: "Budget en clair, ex. \"300 à 400 000 euros\" ou \"1200 euros par mois\"",
          },
          rooms: {
            type: 'integer',
            description: 'Nombre de pièces souhaitées. 0 si non précisé.',
            minimum: 0,
          },
          timing: {
            type: 'string',
            description: 'Timing du projet ("urgent", "3 mois", "6 mois", "pas pressé"…)',
          },
          mustHaves: {
            type: 'string',
            description: 'Critères importants en clair texte (extérieur, parking…). Vide si rien.',
          },
          notes: {
            type: 'string',
            description:
              "Autres infos pertinentes (état du bien, financement déjà obtenu, contexte spécial). Vide si rien.",
          },
        },
        required: ['leadType', 'customerName', 'customerPhone'],
      },
    },
    server: { url: webhookUrl, secret: process.env.VAPI_WEBHOOK_SECRET?.trim() },
  };
}

function buildToolsForSector(sector: Sector, webhookUrl: string) {
  switch (sector) {
    case 'restaurant':
      return [reservationToolSpec(webhookUrl)];
    case 'immobilier':
      return [leadToolSpec(webhookUrl)];
    default:
      return [];
  }
}

// Vapi requires tools to be created as standalone resources first (via POST
// /tool), then referenced from an assistant by ID (model.toolIds). Inline
// model.tools is not supported — Vapi accepts the payload silently but
// doesn't register the function with its server-side routing.
async function createVapiTool(toolSpec: object, apiKey: string): Promise<string> {
  const res = await fetch('https://api.vapi.ai/tool', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toolSpec),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Vapi tool create failed: ${res.status} - ${errorText}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

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
  // Honor the user-edited prompt if non-empty; otherwise rebuild from the persona template.
  const rawPrompt = overrides.systemPrompt?.trim()
    ? overrides.systemPrompt
    : buildPersonalizedPrompt(config, businessInfo, enrichedContext);
  const systemPrompt = rawPrompt.replace(/\{\{business_name\}\}/g, businessName);

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

  // Pre-existing Vapi tools (Google Calendar built-ins created by the user in
  // the Vapi dashboard with their own OAuth connection). For immobilier we
  // pull the IDs from env so the bot can check availability and book visits.
  const staticToolIds: string[] = [];
  if (config.sector === 'immobilier') {
    const availabilityId = process.env.VAPI_TOOL_AVAILABILITY_ID?.trim();
    const eventId = process.env.VAPI_TOOL_EVENT_ID?.trim();
    if (availabilityId) staticToolIds.push(availabilityId);
    if (eventId) staticToolIds.push(eventId);
  }

  const toolIds = [...dynamicToolIds, ...staticToolIds];

  const payload = {
    name: `${config.name} - ${businessInfo.name || 'CallBot'}`,
    firstMessage: config.greeting.replace(/\{\{business_name\}\}/g, businessName),
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
    },
    server: {
      url: webhookUrl,
      secret: process.env.VAPI_WEBHOOK_SECRET?.trim(),
    },
    backchannelingEnabled: true,
    backgroundDenoisingEnabled: true,
    numWordsToInterruptAssistant: 2,
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
