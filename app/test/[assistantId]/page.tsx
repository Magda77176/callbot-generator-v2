'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VoiceTester } from '@/components/voice-tester';
import { VoiceTuner, type VoiceConfig } from '@/components/voice-tuner';

const VOICE_PRESETS = [
  {
    id: 'vincent',
    label: 'Vincent (Cartesia)',
    description: 'Énergique, engageant',
    voice: {
      provider: 'cartesia',
      voiceId: '80e11491-2d8a-4361-ac61-c4f3e0a4f7e7',
      model: 'sonic-3',
      language: 'fr',
    },
  },
  {
    id: 'marc',
    label: 'Marc (Cartesia)',
    description: 'Conversationnel, casual',
    voice: {
      provider: 'cartesia',
      voiceId: 'ce74c4da-4aee-435d-bc6d-81d1a9367e12',
      model: 'sonic-3',
      language: 'fr',
    },
  },
  {
    id: 'helene',
    label: 'Hélène (Cartesia)',
    description: 'Cheery, friendly French Lady',
    voice: {
      provider: 'cartesia',
      voiceId: '65b25c5d-ff07-4687-a04c-da2f43ef6fa9',
      model: 'sonic-3',
      language: 'fr',
    },
  },
  {
    id: 'hugo',
    label: 'Hugo (ElevenLabs)',
    description: 'Français chaleureux',
    voice: {
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
  },
  {
    id: 'lucie',
    label: 'Lucie (ElevenLabs)',
    description: 'Féminine française, naturelle',
    voice: {
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
  },
];

interface TestPageProps {
  params: Promise<{ assistantId: string }>;
}

export default function TestPage({ params }: TestPageProps) {
  const { assistantId } = use(params);
  const [currentPreset, setCurrentPreset] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  async function switchVoice(presetId: string) {
    const preset = VOICE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSwitching(true);
    try {
      const res = await fetch('/api/switch-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId, presetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCurrentPreset(presetId);
      toast.success(`Voix : ${preset.label}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      toast.error(`Erreur : ${msg}`);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <Link href="/builder" className="text-sm text-muted-foreground hover:underline">
          ← Retour au builder
        </Link>
        <h1 className="text-3xl font-bold mt-2">Test vocal</h1>
        <p className="text-muted-foreground">Testez votre bot en conditions réelles.</p>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Test A/B voix</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {VOICE_PRESETS.map((p) => (
            <Button
              key={p.id}
              variant={currentPreset === p.id ? 'default' : 'outline'}
              disabled={switching}
              onClick={() => switchVoice(p.id)}
              className="flex flex-col h-auto py-3 px-4"
            >
              <span className="font-semibold">{p.label}</span>
              <span className="text-xs opacity-70">{p.description}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {currentPreset && (
        <div className="mb-4">
          <VoiceTuner
            assistantId={assistantId}
            presetId={currentPreset}
            baseVoice={
              VOICE_PRESETS.find((p) => p.id === currentPreset)!.voice as VoiceConfig
            }
          />
        </div>
      )}

      <VoiceTester assistantId={assistantId} />
    </main>
  );
}
