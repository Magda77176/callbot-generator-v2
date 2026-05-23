'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MODEL_LABELS, type ModelOption } from '@/lib/builder-types';
import {
  CARTESIA_VOICES,
  getVoiceById,
  getVoicesByGender,
  type VoiceGender,
} from '@/lib/voices';

interface StepCustomizePatch {
  systemPrompt?: string;
  voiceId?: string;
  gender?: VoiceGender;
  model?: ModelOption;
  temperature?: number;
}

interface StepCustomizeProps {
  systemPrompt: string;
  voiceId: string;
  gender: VoiceGender;
  model: ModelOption;
  temperature: number;
  onChange: (patch: StepCustomizePatch) => void;
}

export function StepCustomize({
  systemPrompt,
  voiceId,
  gender,
  model,
  temperature,
  onChange,
}: StepCustomizeProps) {
  const currentVoice = getVoiceById(voiceId);
  const filteredVoices = getVoicesByGender(gender);

  const handleGenderChange = (newGender: VoiceGender) => {
    const firstOfGender = CARTESIA_VOICES.find((v) => v.gender === newGender);
    if (firstOfGender) onChange({ voiceId: firstOfGender.id, gender: newGender });
  };

  const handleVoiceChange = (newVoiceId: string) => {
    const voice = getVoiceById(newVoiceId);
    if (voice) onChange({ voiceId: newVoiceId, gender: voice.gender });
  };

  return (
    <div className="space-y-10">
      <div>
        <div className="uppercase text-xs tracking-widest text-default mb-3">— Étape 03</div>
        <h2 className="display-section">Personnalisation</h2>
        <p className="text-muted-foreground mt-4 font-light max-w-xl">
          Ajustez le prompt système, la voix et le modèle IA. Tous les paramètres ont des valeurs
          par défaut calibrées — vous pouvez les laisser tels quels.
        </p>
      </div>

      <Tabs defaultValue="prompt" className="w-full">
        <TabsList className="bg-background border border-border rounded-md p-1 gap-1">
          <TabsTrigger
            value="prompt"
            className="uppercase text-xs tracking-widest data-[state=active]:bg-default data-[state=active]:text-black rounded"
          >
            Prompt
          </TabsTrigger>
          <TabsTrigger
            value="voice"
            className="uppercase text-xs tracking-widest data-[state=active]:bg-default data-[state=active]:text-black rounded"
          >
            Voix
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="uppercase text-xs tracking-widest data-[state=active]:bg-default data-[state=active]:text-black rounded"
          >
            Avancé
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <label
              htmlFor="systemPrompt"
              className="uppercase text-xs tracking-widest text-muted-foreground"
            >
              Prompt système
            </label>
            <span className="text-xs text-muted-foreground font-mono">
              {systemPrompt.length} caractères
            </span>
          </div>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
            rows={20}
            className="bg-background border-border font-mono text-sm rounded-md leading-relaxed"
          />
          <p className="text-xs text-muted-foreground font-light">
            La variable {'{{business_name}}'} est remplacée au déploiement par le nom de
            l&apos;établissement.
          </p>
        </TabsContent>

        <TabsContent value="voice" className="space-y-8 mt-6">
          <div className="space-y-3">
            <label className="block uppercase text-xs tracking-widest text-muted-foreground">
              Genre de la voix
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGenderChange('male')}
                className={
                  'rounded-md border p-5 text-left transition-colors ' +
                  (gender === 'male'
                    ? 'border-default bg-default/5 ring-2 ring-default'
                    : 'border-border bg-card hover:border-default/40')
                }
              >
                <div className="display-light text-xl uppercase">Homme</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                  Voix masculine
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleGenderChange('female')}
                className={
                  'rounded-md border p-5 text-left transition-colors ' +
                  (gender === 'female'
                    ? 'border-default bg-default/5 ring-2 ring-default'
                    : 'border-border bg-card hover:border-default/40')
                }
              >
                <div className="display-light text-xl uppercase">Femme</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                  Voix féminine
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="voice"
              className="block uppercase text-xs tracking-widest text-muted-foreground"
            >
              Voix Cartesia
            </label>
            <select
              id="voice"
              value={voiceId}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full h-11 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-default"
            >
              {filteredVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {currentVoice && (
              <p className="text-sm font-light text-muted-foreground">
                {currentVoice.description}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-8 mt-6">
          <div className="space-y-3">
            <label
              htmlFor="model"
              className="block uppercase text-xs tracking-widest text-muted-foreground"
            >
              Modèle LLM
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => onChange({ model: e.target.value as ModelOption })}
              className="w-full h-11 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-default"
            >
              {(Object.keys(MODEL_LABELS) as ModelOption[]).map((m) => (
                <option key={m} value={m}>
                  {MODEL_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="temperature"
                className="uppercase text-xs tracking-widest text-muted-foreground"
              >
                Température
              </label>
              <span className="display-light text-3xl tabular-nums">{temperature.toFixed(2)}</span>
            </div>
            <input
              id="temperature"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temperature}
              onChange={(e) => onChange({ temperature: Number.parseFloat(e.target.value) })}
              className="w-full accent-[oklch(0.65_0.19_50)]"
            />
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>0 · déterministe</span>
              <span>1 · créatif</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
