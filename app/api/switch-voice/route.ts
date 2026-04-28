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
  marc: {
    provider: 'cartesia',
    voiceId: 'ce74c4da-4aee-435d-bc6d-81d1a9367e12',
    model: 'sonic-3',
    language: 'fr',
  },
  helene: {
    provider: 'cartesia',
    voiceId: '65b25c5d-ff07-4687-a04c-da2f43ef6fa9',
    model: 'sonic-3',
    language: 'fr',
  },
  hugo: {
    provider: '11labs',
    voiceId: 'odOFTFZU3DvAZ3EV3KHi',
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
    stability: 0.45,
    similarityBoost: 0.80,
    style: 0.30,
    useSpeakerBoost: true,
    speed: 1.00,
  },
};

const PRESET_AGENT_NAMES: Record<string, string> = {
  vincent: 'Vincent',
  marc: 'Marc',
  helene: 'Hélène',
  hugo: 'Hugo',
  lucie: 'Lucie',
};

const KNOWN_AGENT_NAMES = [
  'Marco', 'Léa', 'Tom', 'Alex', 'Sophie',
  'Vincent', 'Marc', 'Hélène', 'Hugo', 'Lucie',
];

interface VoiceOverride {
  voiceId?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
}

interface SwitchRequestBody {
  assistantId?: string;
  presetId?: string;
  voiceOverride?: VoiceOverride;
}

const NUMERIC_RANGES: Record<keyof VoiceOverride, [number, number] | null> = {
  voiceId: null,
  model: null,
  stability: [0, 1],
  similarityBoost: [0, 1],
  style: [0, 1],
  useSpeakerBoost: null,
  speed: [0.5, 2],
};

function sanitizeOverride(o: VoiceOverride): VoiceOverride {
  const out: VoiceOverride = {};
  if (typeof o.voiceId === 'string' && o.voiceId.length > 0 && o.voiceId.length < 200) {
    out.voiceId = o.voiceId;
  }
  if (typeof o.model === 'string' && o.model.length > 0 && o.model.length < 100) {
    out.model = o.model;
  }
  if (typeof o.useSpeakerBoost === 'boolean') {
    out.useSpeakerBoost = o.useSpeakerBoost;
  }
  for (const key of ['stability', 'similarityBoost', 'style', 'speed'] as const) {
    const v = o[key];
    const range = NUMERIC_RANGES[key];
    if (typeof v === 'number' && range && v >= range[0] && v <= range[1]) {
      out[key] = v;
    }
  }
  return out;
}

interface VapiModelMessage {
  role?: string;
  content?: unknown;
}

interface VapiModel {
  systemPrompt?: string;
  messages?: VapiModelMessage[];
  [k: string]: unknown;
}

interface VapiAssistant {
  firstMessage?: string;
  model?: VapiModel;
  [k: string]: unknown;
}

export async function POST(req: NextRequest) {
  if (!process.env.VAPI_API_KEY) {
    return NextResponse.json({ error: 'VAPI_API_KEY manquante' }, { status: 500 });
  }

  try {
    const { assistantId, presetId, voiceOverride } = (await req.json()) as SwitchRequestBody;

    if (!assistantId || !presetId) {
      return NextResponse.json(
        { error: 'assistantId et presetId requis' },
        { status: 400 },
      );
    }

    const baseVoice = VOICE_PRESETS[presetId];
    const newAgentName = PRESET_AGENT_NAMES[presetId];
    if (!baseVoice || !newAgentName) {
      return NextResponse.json({ error: `Preset inconnu: ${presetId}` }, { status: 400 });
    }

    const voice: VapiVoice = voiceOverride
      ? { ...baseVoice, ...sanitizeOverride(voiceOverride) }
      : baseVoice;

    const auth = `Bearer ${process.env.VAPI_API_KEY}`;

    // GET current assistant pour détecter l'ancien prénom et patcher firstMessage + systemPrompt
    const getRes = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: { Authorization: auth },
    });
    if (!getRes.ok) {
      const err = await getRes.text();
      return NextResponse.json(
        { error: `Vapi GET ${getRes.status}: ${err}` },
        { status: getRes.status },
      );
    }
    const current = (await getRes.json()) as VapiAssistant;

    const patchBody: Record<string, unknown> = { voice };

    const currentFirstMessage = current.firstMessage ?? '';
    const firstWord = currentFirstMessage.match(/^[\p{L}-]+/u)?.[0] ?? '';
    const oldAgentName = KNOWN_AGENT_NAMES.includes(firstWord) ? firstWord : null;

    if (oldAgentName && oldAgentName !== newAgentName) {
      const swap = (s: string) => s.split(oldAgentName).join(newAgentName);

      patchBody.firstMessage = swap(currentFirstMessage);

      if (current.model) {
        const newModel: VapiModel = { ...current.model };
        if (typeof newModel.systemPrompt === 'string') {
          newModel.systemPrompt = swap(newModel.systemPrompt);
        }
        if (Array.isArray(newModel.messages)) {
          newModel.messages = newModel.messages.map((m) => ({
            ...m,
            content: typeof m.content === 'string' ? swap(m.content) : m.content,
          }));
        }
        patchBody.model = newModel;
      }
    }

    const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchBody),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Vapi ${res.status}: ${err}` },
        { status: res.status },
      );
    }

    return NextResponse.json({
      success: true,
      presetId,
      agentName: newAgentName,
      renamedFrom: oldAgentName,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
