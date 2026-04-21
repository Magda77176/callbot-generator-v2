import { NextResponse } from 'next/server';
import {
  CALLBOT_CONFIGS,
  buildPersonalizedPrompt,
  isSector,
  type BusinessInfo,
  type CallbotConfig,
} from '@/lib/callbot-configs';

const WEBHOOK_URL = 'https://webhook.homepop.fr/webhook/vapi';

interface DeployRequestBody {
  sector?: string;
  businessInfo?: BusinessInfo;
}

interface VapiAssistantResponse {
  id: string;
  phoneNumber?: string;
}

async function deployToVapi(config: CallbotConfig, businessInfo: BusinessInfo): Promise<VapiAssistantResponse> {
  const systemPrompt = buildPersonalizedPrompt(config, businessInfo);
  const businessName = businessInfo.name || 'notre établissement';

  const payload = {
    name: `${config.name} - ${businessInfo.name || 'CallBot'}`,
    firstMessage: config.greeting.replace(/\{\{business_name\}\}/g, businessName),
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 200,
      systemPrompt,
    },
    voice: {
      provider: 'cartesia',
      voiceId: 'a8a1eb38-5f15-4c1d-8722-7ac0f329727d',
      model: 'sonic-multilingual',
      language: 'fr',
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'fr',
    },
    server: {
      url: WEBHOOK_URL,
      secret: process.env.VAPI_WEBHOOK_SECRET,
    },
  };

  const response = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
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
  if (!process.env.VAPI_API_KEY || !process.env.VAPI_WEBHOOK_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Configuration serveur incomplète (env vars manquantes)' },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as DeployRequestBody;
    const { sector, businessInfo } = body;

    if (!sector || !isSector(sector)) {
      return NextResponse.json(
        {
          success: false,
          error: `Secteur '${sector}' non supporté. Secteurs disponibles: ${Object.keys(CALLBOT_CONFIGS).join(', ')}`,
        },
        { status: 400 },
      );
    }

    const config = CALLBOT_CONFIGS[sector];
    const result = await deployToVapi(config, businessInfo || {});

    return NextResponse.json({
      success: true,
      assistantId: result.id,
      phoneNumber: result.phoneNumber || "En cours d'attribution...",
      sector,
      assistantName: config.name,
      businessName: businessInfo?.name || 'Non défini',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ Erreur déploiement Vapi:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
