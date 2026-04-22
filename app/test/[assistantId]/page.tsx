'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VoiceTester } from '@/components/voice-tester';

const VOICE_PRESETS = [
  {
    id: 'vincent',
    label: 'Vincent (Cartesia)',
    description: 'Économique',
    voice: {
      provider: 'cartesia',
      voiceId: '80e11491-2d8a-4361-ac61-c4f3e0a4f7e7',
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
      voiceId: 'IbbR6Av0dWuQJS0b8JVT',
      model: 'eleven_turbo_v2_5',
      language: 'fr',
      stability: 0.60,
      similarityBoost: 0.75,
      style: 0.35,
      useSpeakerBoost: true,
      speed: 1.10,
    },
  },
  {
    id: 'lucie',
    label: 'Lucie (ElevenLabs)',
    description: 'Féminine française',
    voice: {
      provider: '11labs',
      voiceId: 'YxrwjAKoUKULGd0g8K9Y',
      model: 'eleven_turbo_v2_5',
      language: 'fr',
      stability: 0.60,
      similarityBoost: 0.75,
      style: 0.35,
      useSpeakerBoost: true,
      speed: 1.10,
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

      <VoiceTester assistantId={assistantId} />
    </main>
  );
}
