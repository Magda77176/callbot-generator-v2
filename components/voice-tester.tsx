'use client';

import Vapi from '@vapi-ai/web';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VoiceWaveform } from '@/components/voice-waveform';
import { cn } from '@/lib/utils';

type CallStatus = 'idle' | 'loading' | 'active' | 'ended' | 'error';
type SpeakerRole = 'user' | 'assistant' | null;

interface TranscriptMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface VapiMessage {
  type?: string;
  role?: 'user' | 'assistant';
  transcript?: string;
  transcriptType?: string;
}

interface VoiceTesterProps {
  assistantId: string;
}

const COST_PER_MINUTE_EUR = 0.05;

export function VoiceTester({ assistantId }: VoiceTesterProps) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerRole>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // If this assistant is part of a Vapi squad, we start the call with the
  // squadId so handoffs work. We discover this on mount via /api/lookup-squad.
  const [squadId, setSquadId] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resolve squad membership early — non-blocking.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/lookup-squad?assistantId=${encodeURIComponent(assistantId)}`)
      .then((r) => r.json())
      .then((d: { squadId?: string | null }) => {
        if (!cancelled && d.squadId) setSquadId(d.squadId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [assistantId]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch('/api/vapi-token');
        const data = (await res.json()) as { publicKey: string | null; error?: string };
        if (!res.ok || !data.publicKey) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        if (cancelled) return;

        const vapi = new Vapi(data.publicKey);
        vapiRef.current = vapi;

        vapi.on('call-start', () => {
          setStatus('active');
          startTimeRef.current = Date.now();
          tickRef.current = setInterval(() => {
            if (startTimeRef.current) {
              setDurationSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }
          }, 1000);
        });

        vapi.on('call-end', () => {
          setStatus('ended');
          setCurrentSpeaker(null);
          if (tickRef.current) clearInterval(tickRef.current);
        });

        vapi.on('speech-start', () => setCurrentSpeaker('assistant'));
        vapi.on('speech-end', () => setCurrentSpeaker(null));

        vapi.on('message', (msg: VapiMessage) => {
          if (
            msg.type === 'transcript' &&
            msg.transcriptType === 'final' &&
            msg.role &&
            msg.transcript
          ) {
            setTranscript((prev) => [
              ...prev,
              { role: msg.role as 'user' | 'assistant', text: msg.transcript as string, timestamp: Date.now() },
            ]);
          }
        });

        vapi.on('volume-level', (v: number) => {
          setVolume(v);
        });

        vapi.on('error', (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Erreur Vapi';
          setError(message);
          setStatus('error');
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(message);
        setStatus('error');
      }
    }

    init();

    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
      vapiRef.current?.stop();
    };
  }, []);

  const handleStart = async () => {
    if (!vapiRef.current) return;
    setStatus('loading');
    setTranscript([]);
    setDurationSec(0);
    setError(null);
    try {
      // Vapi SDK signature: start(assistant?, assistantOverrides?, squad?, ...)
      // When this assistant is part of a squad, pass squadId as the 3rd arg so
      // handoffs work. Otherwise standard single-assistant start.
      if (squadId) {
        await vapiRef.current.start(undefined, undefined, squadId);
      } else {
        await vapiRef.current.start(assistantId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de démarrage';
      setError(message);
      setStatus('error');
    }
  };

  const handleStop = () => vapiRef.current?.stop();

  const isActive = status === 'active';
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const costEstimate = ((durationSec / 60) * COST_PER_MINUTE_EUR).toFixed(3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 py-8">
          {isActive ? (
            <div className="w-full max-w-md">
              <VoiceWaveform volume={volume} active={isActive} height={140} />
            </div>
          ) : (
            <div
              className={cn(
                'w-32 h-32 rounded-full flex items-center justify-center text-5xl transition-all',
                status === 'ended' && 'bg-muted ring-2 ring-border',
                status === 'loading' && 'bg-default/15 ring-2 ring-default animate-pulse',
                status === 'idle' && 'bg-muted',
                status === 'error' && 'bg-destructive/15 ring-2 ring-destructive',
              )}
            >
              {status === 'loading' ? '⏳' : status === 'ended' ? '✓' : '📞'}
            </div>
          )}
          {isActive ? (
            <Button variant="destructive" size="lg" onClick={handleStop}>
              🛑 Arrêter l&apos;appel
            </Button>
          ) : (
            <Button
              size="lg"
              disabled={status === 'loading' || (status === 'error' && !vapiRef.current)}
              onClick={handleStart}
            >
              {status === 'loading' ? 'Connexion…' : "🎤 Démarrer l'appel"}
            </Button>
          )}
          {error && <p className="text-sm text-destructive text-center max-w-xs">{error}</p>}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Statut</span>
            <Badge variant={isActive ? 'default' : 'secondary'}>{status}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Durée</span>
            <span className="font-mono">{formattedDuration}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coût estimé</span>
            <span className="font-mono">{costEstimate} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assistant ID</span>
            <span className="font-mono text-xs truncate max-w-[200px]">{assistantId}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Transcript</h3>
        <div className="bg-muted rounded-lg p-4 h-[400px] overflow-y-auto space-y-3">
          {transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun échange pour l&apos;instant. Démarrez l&apos;appel.
            </p>
          ) : (
            transcript.map((msg, i) => (
              <div key={i} className={cn('text-sm', msg.role === 'user' && 'text-right')}>
                <Badge variant={msg.role === 'user' ? 'default' : 'secondary'} className="mb-1">
                  {msg.role === 'user' ? 'Vous' : 'Bot'}
                </Badge>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
