'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Personnalisation</h2>
        <p className="text-muted-foreground mt-1">Ajustez le prompt, la voix et le modèle.</p>
      </div>
      <Tabs defaultValue="prompt" className="w-full">
        <TabsList>
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
          <TabsTrigger value="voice">Voix</TabsTrigger>
          <TabsTrigger value="advanced">Avancé</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="space-y-2 mt-4">
          <Label htmlFor="systemPrompt">Prompt système</Label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
            rows={18}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Les variables {'{{business_name}}'} sont remplacées au déploiement.
          </p>
        </TabsContent>

        <TabsContent value="voice" className="space-y-6 mt-4">
          <div className="space-y-3">
            <Label>Genre de la voix</Label>
            <RadioGroup
              value={gender}
              onValueChange={(v) => v && handleGenderChange(v as VoiceGender)}
              className="flex gap-6"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="male" />
                <span className="text-sm">Homme</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="female" />
                <span className="text-sm">Femme</span>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice">Voix Cartesia</Label>
            <Select value={voiceId} onValueChange={(v) => v && handleVoiceChange(v)}>
              <SelectTrigger id="voice" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredVoices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentVoice && (
              <p className="text-sm text-muted-foreground">{currentVoice.description}</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="model">Modèle LLM</Label>
            <Select
              value={model}
              onValueChange={(v) => v && onChange({ model: v as ModelOption })}
            >
              <SelectTrigger id="model" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MODEL_LABELS) as ModelOption[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODEL_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature">Température : {temperature.toFixed(2)}</Label>
            <input
              id="temperature"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temperature}
              onChange={(e) => onChange({ temperature: Number.parseFloat(e.target.value) })}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              0 = réponses déterministes, 1 = créatif.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
