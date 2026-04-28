'use client';

import { RotateCcw, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

export interface VoiceConfig {
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

interface VoiceTunerProps {
  assistantId: string;
  presetId: string;
  baseVoice: VoiceConfig;
}

const ELEVEN_MODELS = [
  { value: 'eleven_turbo_v2_5', label: 'Turbo v2.5 (rapide)' },
  { value: 'eleven_multilingual_v2', label: 'Multilingual v2 (qualité FR)' },
  { value: 'eleven_flash_v2_5', label: 'Flash v2.5 (très rapide)' },
];

const STORAGE_PREFIX = 'voice-tuning-v1:';

function storageKey(assistantId: string, presetId: string) {
  return `${STORAGE_PREFIX}${assistantId}:${presetId}`;
}

function loadOverride(assistantId: string, presetId: string): Partial<VoiceConfig> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(assistantId, presetId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveOverride(
  assistantId: string,
  presetId: string,
  override: Partial<VoiceConfig>,
) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKey(assistantId, presetId),
      JSON.stringify(override),
    );
  } catch {
    // ignore quota errors
  }
}

function clearOverride(assistantId: string, presetId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(assistantId, presetId));
  } catch {
    // ignore
  }
}

interface SliderRowProps {
  id: string;
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function SliderRow({
  id,
  label,
  hint,
  min,
  max,
  step,
  value,
  display,
  onChange,
  disabled,
}: SliderRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {display(value)}
        </span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function VoiceTuner({ assistantId, presetId, baseVoice }: VoiceTunerProps) {
  const [voice, setVoice] = useState<VoiceConfig>(baseVoice);
  const [applying, setApplying] = useState(false);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load override from localStorage when preset changes
  useEffect(() => {
    const override = loadOverride(assistantId, presetId);
    setVoice(override ? { ...baseVoice, ...override } : baseVoice);
    setDirty(Boolean(override));
  }, [assistantId, presetId, baseVoice]);

  const overrideKeys = useMemo<(keyof VoiceConfig)[]>(
    () => ['voiceId', 'model', 'stability', 'similarityBoost', 'style', 'useSpeakerBoost', 'speed'],
    [],
  );

  const computeOverride = (current: VoiceConfig): Partial<VoiceConfig> => {
    const out: Partial<VoiceConfig> = {};
    for (const k of overrideKeys) {
      if (current[k] !== baseVoice[k] && current[k] !== undefined) {
        // @ts-expect-error: dynamic key write
        out[k] = current[k];
      }
    }
    return out;
  };

  const applyToVapi = async (override: Partial<VoiceConfig>) => {
    setApplying(true);
    try {
      const res = await fetch('/api/switch-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId,
          presetId,
          voiceOverride: Object.keys(override).length > 0 ? override : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success('Réglages voix appliqués');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      toast.error(`Échec : ${msg}`);
    } finally {
      setApplying(false);
    }
  };

  const update = <K extends keyof VoiceConfig>(key: K, value: VoiceConfig[K]) => {
    setVoice((prev) => {
      const next = { ...prev, [key]: value };
      const override = computeOverride(next);
      saveOverride(assistantId, presetId, override);
      setDirty(Object.keys(override).length > 0);
      // Debounce auto-apply (700ms after last change)
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        applyToVapi(override);
      }, 700);
      return next;
    });
  };

  const handleReset = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    clearOverride(assistantId, presetId);
    setVoice(baseVoice);
    setDirty(false);
    await applyToVapi({});
  };

  const handleApplyNow = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await applyToVapi(computeOverride(voice));
  };

  const isEleven = voice.provider === '11labs';
  const isCartesia = voice.provider === 'cartesia';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Réglages voix avancés</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Auto-appliqué 0,7 s après chaque changement · sauvegardé dans le navigateur
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="secondary">Modifié</Badge>}
          {applying && <Badge>En cours…</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isEleven && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="model" className="text-sm">
                Modèle ElevenLabs
              </Label>
              <Select
                value={voice.model}
                onValueChange={(v) => {
                  if (v) update('model', v);
                }}
                disabled={applying}
              >
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELEVEN_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SliderRow
              id="stability"
              label="Stabilité"
              hint="Bas = plus expressif et variable. Haut = plus monotone et prévisible."
              min={0}
              max={1}
              step={0.05}
              value={voice.stability ?? 0.5}
              display={(v) => v.toFixed(2)}
              onChange={(v) => update('stability', v)}
              disabled={applying}
            />

            <SliderRow
              id="similarityBoost"
              label="Similarity boost"
              hint="Force la voix à coller à l'empreinte d'origine. Trop haut = artefacts."
              min={0}
              max={1}
              step={0.05}
              value={voice.similarityBoost ?? 0.75}
              display={(v) => v.toFixed(2)}
              onChange={(v) => update('similarityBoost', v)}
              disabled={applying}
            />

            <SliderRow
              id="style"
              label="Style / expressivité"
              hint="Inflexions émotionnelles. Trop haut = instabilité (hachure, mots répétés)."
              min={0}
              max={1}
              step={0.05}
              value={voice.style ?? 0}
              display={(v) => v.toFixed(2)}
              onChange={(v) => update('style', v)}
              disabled={applying}
            />

            <SliderRow
              id="speed"
              label="Vitesse"
              hint="1.00 = normal. <1 plus lent, >1 plus rapide. Limite raisonnable : 0.85–1.20."
              min={0.7}
              max={1.5}
              step={0.05}
              value={voice.speed ?? 1.0}
              display={(v) => `${v.toFixed(2)}×`}
              onChange={(v) => update('speed', v)}
              disabled={applying}
            />

            <div className="flex items-center justify-between pt-1">
              <div>
                <Label htmlFor="useSpeakerBoost" className="text-sm">
                  Speaker boost
                </Label>
                <p className="text-xs text-muted-foreground">
                  Recommandé pour la téléphonie (clarté).
                </p>
              </div>
              <Switch
                id="useSpeakerBoost"
                checked={voice.useSpeakerBoost ?? false}
                onCheckedChange={(c) => update('useSpeakerBoost', c)}
                disabled={applying}
              />
            </div>
          </>
        )}

        {isCartesia && (
          <>
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium mb-1">Provider Cartesia (sonic-3)</p>
              <p className="text-xs text-muted-foreground">
                Cartesia n'expose pas via Vapi de paramètres fins (stability, style, etc.).
                Seul <code className="font-mono">speed</code> est ajustable
                (multiplicateur 0.7–1.5). Si Vapi rejette une valeur, le bouton repassera en
                erreur — ajuste ou repasse en preset par défaut.
              </p>
            </div>

            <SliderRow
              id="speed-cartesia"
              label="Vitesse"
              hint="1.00 = vitesse Cartesia native."
              min={0.7}
              max={1.5}
              step={0.05}
              value={voice.speed ?? 1.0}
              display={(v) => `${v.toFixed(2)}×`}
              onChange={(v) => update('speed', v)}
              disabled={applying}
            />
          </>
        )}

        {!isEleven && !isCartesia && (
          <p className="text-sm text-muted-foreground">
            Provider <code>{voice.provider}</code> non géré par le tuner pour l'instant.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={applying || !dirty}
          >
            <RotateCcw className="mr-2" size={14} />
            Réinitialiser
          </Button>
          <Button size="sm" onClick={handleApplyNow} disabled={applying}>
            <Save className="mr-2" size={14} />
            Appliquer maintenant
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
