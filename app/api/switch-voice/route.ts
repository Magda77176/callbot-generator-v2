import { NextRequest, NextResponse } from 'next/server';

interface VapiVoice {
  provider: string;
  voiceId: string;
  model: string;
  language: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
}

const VOICE_PRESETS: Record<string, VapiVoice> = {
  vincent: {
    provider: 'cartesia',
    voiceId: '80e11491-2d8a-4361-ac61-c4f3e0a4f7e7',
    model: 'sonic-3',
    language: 'fr',
  },
  hugo: {
    provider: '11labs',
    voiceId: 'IbbR6Av0dWuQJS0b8JVT',
    model: 'eleven_turbo_v2_5',
    language: 'fr',
    stability: 0.60,
    similarityBoost: 0.75,
    style: 0.55,
    useSpeakerBoost: true,
    speed: 1.10,
  },
  lucie: {
    provider: '11labs',
    voiceId: 'YxrwjAKoUKULGd0g8K9Y',
    model: 'eleven_multilingual_v2',
    language: 'fr',
    stability: 0.60,
    similarityBoost: 0.75,
    style: 0.55,
    useSpeakerBoost: true,
    speed: 1.10,
  },
};

interface SwitchRequestBody {
  assistantId?: string;
  presetId?: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.VAPI_API_KEY) {
    return NextResponse.json({ error: 'VAPI_API_KEY manquante' }, { status: 500 });
  }

  try {
    const { assistantId, presetId } = (await req.json()) as SwitchRequestBody;

    if (!assistantId || !presetId) {
      return NextResponse.json(
        { error: 'assistantId et presetId requis' },
        { status: 400 },
      );
    }

    const voice = VOICE_PRESETS[presetId];
    if (!voice) {
      return NextResponse.json({ error: `Preset inconnu: ${presetId}` }, { status: 400 });
    }

    const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voice }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Vapi ${res.status}: ${err}` },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true, presetId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
