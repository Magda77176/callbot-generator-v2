'use client';

import { CALLBOT_CONFIGS } from '@/lib/callbot-configs';
import { MODEL_LABELS, type BuilderState } from '@/lib/builder-types';
import { getVoiceById } from '@/lib/voices';

interface StepReviewProps {
  state: BuilderState;
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline py-3 border-b border-border last:border-0 gap-4">
      <span className="uppercase text-xs tracking-widest text-muted-foreground shrink-0">
        {label}
      </span>
      <span className="text-sm text-right font-light min-w-0 truncate">{value || '—'}</span>
    </div>
  );
}

export function StepReview({ state }: StepReviewProps) {
  if (!state.sector) return null;
  const template = CALLBOT_CONFIGS[state.sector];
  const voice = getVoiceById(state.voiceId);

  const contextPreview = state.enrichedContext
    ? state.enrichedContext.split('\n').filter(Boolean).slice(0, 5).join('\n')
    : null;

  return (
    <div className="space-y-10">
      <div>
        <div className="uppercase text-xs tracking-widest text-default mb-3">— Étape 04</div>
        <h2 className="display-section">Résumé avant déploiement</h2>
        <p className="text-muted-foreground mt-4 font-light max-w-xl">
          Vérifiez la configuration, puis déployez sur Vapi. Le bot sera prêt à recevoir des
          appels en moins de 2 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border bg-card p-6">
          <div className="uppercase text-xs tracking-widest text-default mb-4">Template</div>
          <div className="display-light text-2xl uppercase">{state.sector}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            Persona {template.name}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <div className="uppercase text-xs tracking-widest text-default mb-4">Établissement</div>
          <div className="space-y-2">
            <SummaryRow label="Nom" value={state.businessInfo.name} />
            <SummaryRow label="Adresse" value={state.businessInfo.address} />
            <SummaryRow label="Téléphone" value={state.businessInfo.phone} />
            <SummaryRow label="Horaires" value={state.businessInfo.hours} />
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <div className="uppercase text-xs tracking-widest text-default mb-4">Voix</div>
          <div className="display-light text-2xl uppercase mb-1">{voice?.name || '—'}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest">
            {state.gender === 'male' ? 'Voix masculine' : 'Voix féminine'}
          </div>
          {voice && (
            <p className="mt-3 text-sm font-light text-muted-foreground">{voice.description}</p>
          )}
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <div className="uppercase text-xs tracking-widest text-default mb-4">Modèle IA</div>
          <div className="display-light text-2xl uppercase">{MODEL_LABELS[state.model]}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            Température · {state.temperature.toFixed(2)}
          </div>
        </div>
      </div>

      {contextPreview && (
        <details className="rounded-md border border-border bg-card p-5 group">
          <summary className="cursor-pointer uppercase text-xs tracking-widest text-default list-none flex justify-between items-center [&::-webkit-details-marker]:hidden">
            Contexte business enrichi (aperçu)
            <span className="text-muted-foreground transition-transform group-open:rotate-180">↓</span>
          </summary>
          <pre className="mt-4 text-xs whitespace-pre-wrap text-muted-foreground font-light leading-relaxed">
            {contextPreview}
            {state.enrichedContext &&
            state.enrichedContext.split('\n').filter(Boolean).length > 5
              ? '\n…'
              : ''}
          </pre>
        </details>
      )}

      <div className="rounded-md border border-border bg-card p-6">
        <div className="uppercase text-xs tracking-widest text-default mb-4">
          Prompt système · extrait
        </div>
        <pre className="text-xs whitespace-pre-wrap max-h-64 overflow-auto bg-background border border-border p-4 rounded font-mono leading-relaxed text-muted-foreground">
          {state.systemPrompt.slice(0, 800)}
          {state.systemPrompt.length > 800 ? '…' : ''}
        </pre>
      </div>
    </div>
  );
}
