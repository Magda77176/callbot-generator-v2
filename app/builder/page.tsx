'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { StepBusiness } from '@/components/builder/step-business';
import { StepCustomize } from '@/components/builder/step-customize';
import { StepReview } from '@/components/builder/step-review';
import { StepTemplate } from '@/components/builder/step-template';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CALLBOT_CONFIGS, type Sector } from '@/lib/callbot-configs';
import type { BuilderState } from '@/lib/builder-types';
import { DEFAULT_VOICE_ID } from '@/lib/voices';

const STEPS = ['Template', 'Établissement', 'Personnalisation', 'Déploiement'] as const;

const INITIAL_STATE: BuilderState = {
  sector: null,
  businessInfo: {},
  systemPrompt: '',
  voiceId: DEFAULT_VOICE_ID,
  model: 'gpt-4o-mini',
  temperature: 0.3,
};

export default function BuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<BuilderState>(INITIAL_STATE);
  const [deploying, setDeploying] = useState(false);

  const canNext = (() => {
    if (step === 0) return state.sector !== null;
    if (step === 1) return Boolean(state.businessInfo.name?.trim());
    return true;
  })();

  const handleSelectSector = (sector: Sector) => {
    setState((s) => ({
      ...s,
      sector,
      systemPrompt: CALLBOT_CONFIGS[sector].systemPrompt,
    }));
  };

  const handleDeploy = async () => {
    if (!state.sector) return;
    setDeploying(true);
    try {
      const res = await fetch('/api/deploy-vapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector: state.sector, businessInfo: state.businessInfo }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erreur inconnue');
      toast.success(`Bot ${data.assistantName} déployé !`);
      router.push(`/test/${data.assistantId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Échec du déploiement : ${message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleTestBeforeDeploy = () => {
    toast.info('Preview sans déploiement — disponible prochainement.');
  };

  const progressValue = ((step + 1) / STEPS.length) * 100;

  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">CallBot Builder</h1>
        <p className="text-muted-foreground">
          Créez et déployez un assistant vocal en 4 étapes.
        </p>
      </header>

      <div className="mb-8 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            Étape {step + 1} / {STEPS.length} — {STEPS[step]}
          </span>
          <span className="text-muted-foreground">{Math.round(progressValue)}%</span>
        </div>
        <Progress value={progressValue} />
      </div>

      <section className="mb-10">
        {step === 0 && (
          <StepTemplate selectedSector={state.sector} onSelect={handleSelectSector} />
        )}
        {step === 1 && (
          <StepBusiness
            businessInfo={state.businessInfo}
            onChange={(businessInfo) => setState((s) => ({ ...s, businessInfo }))}
          />
        )}
        {step === 2 && (
          <StepCustomize
            systemPrompt={state.systemPrompt}
            voiceId={state.voiceId}
            model={state.model}
            temperature={state.temperature}
            onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
          />
        )}
        {step === 3 && <StepReview state={state} />}
      </section>

      <footer className="flex justify-between gap-4">
        <Button
          variant="outline"
          disabled={step === 0 || deploying}
          onClick={() => setStep((s) => s - 1)}
        >
          Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Suivant
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" disabled={deploying} onClick={handleTestBeforeDeploy}>
              🎤 Tester en vocal
            </Button>
            <Button disabled={deploying || !state.sector} onClick={handleDeploy}>
              {deploying ? 'Déploiement…' : '🚀 Déployer le bot'}
            </Button>
          </div>
        )}
      </footer>
    </main>
  );
}
