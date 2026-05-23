'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, ChevronLeft, Mic, Phone, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { StepBusiness } from '@/components/builder/step-business';
import { StepCustomize } from '@/components/builder/step-customize';
import { StepReview } from '@/components/builder/step-review';
import { StepTemplate } from '@/components/builder/step-template';
import { Button } from '@/components/ui/button';
import { CALLBOT_CONFIGS, type Sector } from '@/lib/callbot-configs';
import type { BuilderState } from '@/lib/builder-types';
import { DEFAULT_VOICE_BY_PERSONA, DEFAULT_VOICE_ID, getVoiceById } from '@/lib/voices';

const STEPS = ['Template', 'Établissement', 'Personnalisation', 'Déploiement'] as const;

const INITIAL_STATE: BuilderState = {
  sector: null,
  businessInfo: {},
  primarySource: '',
  manualMenu: '',
  systemPrompt: '',
  voiceId: DEFAULT_VOICE_ID,
  gender: getVoiceById(DEFAULT_VOICE_ID)?.gender ?? 'male',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  enrichmentStatus: 'idle',
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
    const voiceId = DEFAULT_VOICE_BY_PERSONA[sector];
    const voice = getVoiceById(voiceId);
    setState((s) => ({
      ...s,
      sector,
      systemPrompt: CALLBOT_CONFIGS[sector].systemPrompt,
      voiceId,
      gender: voice?.gender ?? 'male',
    }));
  };

  const handleDeploy = async () => {
    if (!state.sector) return;
    setDeploying(true);
    try {
      const res = await fetch('/api/deploy-vapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: state.sector,
          businessInfo: state.businessInfo,
          voiceId: state.voiceId,
          enrichedContext: state.enrichedContext,
          systemPrompt: state.systemPrompt,
          model: state.model,
          temperature: state.temperature,
        }),
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

  return (
    <main className="min-h-screen">
      {/* Top nav */}
      <header className="container mx-auto max-w-5xl px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center group-hover:ring-glow transition-shadow">
            <Phone className="size-4 text-primary" />
          </div>
          <span className="font-semibold tracking-tight">CallBot</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="size-4" />
          Accueil
        </Link>
      </header>

      {/* Hero strip */}
      <div className="container mx-auto max-w-5xl px-6 pt-2 pb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">CallBot Builder</h1>
        <p className="text-muted-foreground mt-2">
          Créez et déployez un assistant vocal en 4 étapes.
        </p>
      </div>

      {/* Step indicator */}
      <div className="container mx-auto max-w-5xl px-6 pb-8">
        <div className="glass rounded-2xl border border-border p-2 flex items-stretch">
          {STEPS.map((label, idx) => {
            const isActive = idx === step;
            const isDone = idx < step;
            return (
              <div
                key={label}
                className={
                  'flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ' +
                  (isActive
                    ? 'bg-primary/15 text-foreground ring-1 ring-primary/30'
                    : isDone
                      ? 'text-foreground'
                      : 'text-muted-foreground')
                }
              >
                <span
                  className={
                    'size-6 rounded-md flex items-center justify-center text-xs font-mono shrink-0 ' +
                    (isActive
                      ? 'bg-primary text-primary-foreground'
                      : isDone
                        ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'bg-muted text-muted-foreground')
                  }
                >
                  {isDone ? <Check className="size-3.5" /> : idx + 1}
                </span>
                <span className="hidden md:inline truncate">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <section className="container mx-auto max-w-5xl px-6">
        <div className="glass rounded-3xl border border-border p-6 md:p-10">
          {step === 0 && (
            <StepTemplate selectedSector={state.sector} onSelect={handleSelectSector} />
          )}
          {step === 1 && (
            <StepBusiness
              sector={state.sector}
              businessInfo={state.businessInfo}
              primarySource={state.primarySource}
              manualMenu={state.manualMenu}
              enrichedContext={state.enrichedContext}
              enrichmentStatus={state.enrichmentStatus ?? 'idle'}
              detectedType={state.detectedType}
              onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
            />
          )}
          {step === 2 && (
            <StepCustomize
              systemPrompt={state.systemPrompt}
              voiceId={state.voiceId}
              gender={state.gender}
              model={state.model}
              temperature={state.temperature}
              onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
            />
          )}
          {step === 3 && <StepReview state={state} />}
        </div>
      </section>

      {/* Footer nav */}
      <footer className="container mx-auto max-w-5xl px-6 py-10 flex items-center justify-between gap-4">
        <Button
          variant="outline"
          disabled={step === 0 || deploying}
          onClick={() => setStep((s) => s - 1)}
        >
          <ChevronLeft className="size-4" />
          Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Suivant
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" disabled={deploying} onClick={handleTestBeforeDeploy}>
              <Mic className="size-4" />
              Tester en vocal
            </Button>
            <Button disabled={deploying || !state.sector} onClick={handleDeploy}>
              {deploying ? (
                'Déploiement…'
              ) : (
                <>
                  <Rocket className="size-4" />
                  Déployer le bot
                </>
              )}
            </Button>
          </div>
        )}
      </footer>
    </main>
  );
}
