'use client';

import Vapi from '@vapi-ai/web';
import { Bot, Mic, MicOff, Phone, PhoneCall } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { VoiceWaveform } from './voice-waveform';

type CallStatus = 'idle' | 'loading' | 'active' | 'ended' | 'error';

interface TranscriptBubble {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

interface VapiMessage {
  type?: string;
  role?: 'user' | 'assistant';
  transcript?: string;
  transcriptType?: string;
}

/**
 * Live voice demo embedded on the marketing home. Replicates the look of the
 * static CallTranscriptMock when idle, but on click actually starts a Vapi
 * Web SDK session against DEMO_ASSISTANT_ID and renders the real transcript
 * as it arrives.
 */
export function HomeDemoCall() {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [bubbles, setBubbles] = useState<TranscriptBubble[]>([]);
  const [durationSec, setDurationSec] = useState(0);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    publicKey: string;
    demoAssistantId: string | null;
  } | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch credentials once on mount. Vapi SDK then stays initialised across
  // start / stop / restart cycles.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await fetch('/api/vapi-token');
        const data = (await res.json()) as {
          publicKey: string | null;
          demoAssistantId: string | null;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.publicKey) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setCredentials({ publicKey: data.publicKey, demoAssistantId: data.demoAssistantId });

        const vapi = new Vapi(data.publicKey);
        vapiRef.current = vapi;

        vapi.on('call-start', () => {
          setStatus('active');
          startedAtRef.current = Date.now();
          tickRef.current = setInterval(() => {
            if (startedAtRef.current) {
              setDurationSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
            }
          }, 1000);
        });
        vapi.on('call-end', () => {
          setStatus('ended');
          if (tickRef.current) clearInterval(tickRef.current);
        });
        vapi.on('message', (msg: VapiMessage) => {
          if (
            msg.type === 'transcript' &&
            msg.transcriptType === 'final' &&
            msg.role &&
            msg.transcript
          ) {
            setBubbles((prev) => [
              ...prev,
              {
                role: msg.role as 'user' | 'assistant',
                text: msg.transcript as string,
                ts: Date.now(),
              },
            ]);
          }
        });
        vapi.on('volume-level', (v: number) => {
          // Vapi emits the assistant's speaking volume, 0..1.
          setVolume(v);
        });
        vapi.on('error', (err: unknown) => {
          setError(err instanceof Error ? err.message : 'Erreur Vapi');
          setStatus('error');
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Erreur inconnue');
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

  const handleStart = () => {
    if (!credentials?.demoAssistantId) {
      setError("Aucun bot de démo configuré (DEMO_ASSISTANT_ID manquant)");
      setStatus('error');
      return;
    }
    setBubbles([]);
    setError(null);
    setDurationSec(0);
    setStatus('loading');
    try {
      vapiRef.current?.start(credentials.demoAssistantId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      setStatus('error');
    }
  };

  const handleStop = () => {
    vapiRef.current?.stop();
  };

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const isLive = status === 'active' || status === 'loading';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-2.5">
          <div
            className={
              'size-2 rounded-full ' +
              (status === 'active'
                ? 'bg-default pulse-dot'
                : status === 'loading'
                  ? 'bg-default animate-pulse'
                  : status === 'ended'
                    ? 'bg-muted-foreground'
                    : 'bg-muted')
            }
          />
          <span className="text-[10px] uppercase tracking-widest">
            {status === 'idle' && 'Démo · prêt'}
            {status === 'loading' && 'Connexion…'}
            {status === 'active' && 'En cours'}
            {status === 'ended' && 'Terminé'}
            {status === 'error' && 'Erreur'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
          {isLive || status === 'ended' ? formatDur(durationSec) : '—:—'}
        </span>
      </div>

      {/* Body */}
      <div className="min-h-[260px] flex flex-col">
        {/* Waveform shows whenever the call is live or has just ended.
            When idle/error it stays hidden to keep the static preview clean. */}
        {(status === 'loading' || status === 'active' || status === 'ended') && (
          <div className="border-b border-border bg-background/50 py-4">
            <VoiceWaveform
              volume={volume}
              active={status === 'active'}
              height={96}
            />
          </div>
        )}

        <div className="p-5 flex-1 flex flex-col">
          {status === 'idle' && <IdlePlaceholder />}
          {status === 'loading' && (
            <div className="m-auto text-center space-y-3">
              <div className="size-12 rounded-full bg-default/15 ring-1 ring-default/30 flex items-center justify-center mx-auto">
                <PhoneCall className="size-5 text-default animate-pulse" />
              </div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Connexion au bot…
              </p>
            </div>
          )}
          {(status === 'active' || status === 'ended') && bubbles.length === 0 && (
            <div className="m-auto text-center space-y-3">
              <div className="size-12 rounded-full bg-default/15 ring-1 ring-default/30 flex items-center justify-center mx-auto">
                <Mic className="size-5 text-default" />
              </div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Parlez maintenant
              </p>
            </div>
          )}
          {bubbles.length > 0 && (
            <div className="space-y-2 text-sm overflow-y-auto max-h-[260px] pr-1">
              {bubbles.map((b, i) =>
                b.role === 'user' ? (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Phone className="size-3 text-muted-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[80%]">
                      {b.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2 items-end justify-end">
                    <div className="bg-default/15 ring-1 ring-default/30 rounded-2xl rounded-br-sm px-3.5 py-2 max-w-[80%]">
                      {b.text}
                    </div>
                    <div className="size-7 rounded-full bg-default/20 ring-1 ring-default/40 flex items-center justify-center shrink-0">
                      <Bot className="size-3.5 text-default" />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
          {status === 'error' && error && (
            <div className="m-auto text-center space-y-2">
              <p className="text-xs uppercase tracking-widest text-red-400">Erreur démo</p>
              <p className="text-xs text-muted-foreground font-mono">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer / controls */}
      <div className="border-t border-border bg-background px-5 py-3 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {status === 'idle' && 'Cliquez pour parler au bot'}
          {status === 'active' && 'Micro actif · audio temps réel'}
          {status === 'ended' && 'Appel terminé · refaire ?'}
          {status === 'loading' && 'Connexion…'}
          {status === 'error' && 'Vérifier les permissions micro'}
        </div>
        {status === 'active' || status === 'loading' ? (
          <button
            type="button"
            onClick={handleStop}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs uppercase tracking-widest bg-red-500/15 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/20 transition-colors"
          >
            <MicOff className="size-3.5" />
            Arrêter
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={!credentials}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs uppercase tracking-widest bg-default text-black hover:bg-default/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic className="size-3.5" />
            {status === 'ended' ? 'Refaire' : 'Démarrer'}
          </button>
        )}
      </div>
    </div>
  );
}

function IdlePlaceholder() {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex gap-2 items-end">
        <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Phone className="size-3 text-muted-foreground" />
        </div>
        <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[80%]">
          Bonjour, j&apos;aimerais réserver une table pour 4 personnes vendredi.
        </div>
      </div>
      <div className="flex gap-2 items-end justify-end">
        <div className="bg-default/15 ring-1 ring-default/30 rounded-2xl rounded-br-sm px-3.5 py-2 max-w-[80%]">
          Très bien, à quelle heure souhaitez-vous venir ?
        </div>
        <div className="size-7 rounded-full bg-default/20 ring-1 ring-default/40 flex items-center justify-center shrink-0">
          <Bot className="size-3.5 text-default" />
        </div>
      </div>
      <div className="flex gap-2 items-end">
        <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Phone className="size-3 text-muted-foreground" />
        </div>
        <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[80%]">
          Vingt heures.
        </div>
      </div>
      <div className="flex gap-2 items-end justify-end">
        <div className="bg-default/15 ring-1 ring-default/30 rounded-2xl rounded-br-sm px-3.5 py-2 inline-flex items-center gap-1">
          <span className="size-1 rounded-full bg-foreground/60 typing-dot" />
          <span className="size-1 rounded-full bg-foreground/60 typing-dot" />
          <span className="size-1 rounded-full bg-foreground/60 typing-dot" />
        </div>
        <div className="size-7 rounded-full bg-default/20 ring-1 ring-default/40 flex items-center justify-center shrink-0">
          <Bot className="size-3.5 text-default" />
        </div>
      </div>
    </div>
  );
}
