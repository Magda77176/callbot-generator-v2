'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CALLBOT_CONFIGS } from '@/lib/callbot-configs';
import { MODEL_LABELS, type BuilderState } from '@/lib/builder-types';
import { getVoiceById } from '@/lib/voices';

interface StepReviewProps {
  state: BuilderState;
}

export function StepReview({ state }: StepReviewProps) {
  if (!state.sector) return null;
  const template = CALLBOT_CONFIGS[state.sector];
  const voice = getVoiceById(state.voiceId);

  const contextPreview = state.enrichedContext
    ? state.enrichedContext.split('\n').filter(Boolean).slice(0, 5).join('\n')
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Résumé avant déploiement</h2>
        <p className="text-muted-foreground mt-1">
          Vérifiez la configuration, puis déployez sur Vapi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{template.name}</p>
            <Badge variant="secondary" className="capitalize">
              {state.sector}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Établissement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{state.businessInfo.name || '—'}</p>
            {state.businessInfo.address && (
              <p className="text-muted-foreground">{state.businessInfo.address}</p>
            )}
            {state.businessInfo.phone && (
              <p className="text-muted-foreground">{state.businessInfo.phone}</p>
            )}
            {state.businessInfo.hours && (
              <p className="text-muted-foreground">{state.businessInfo.hours}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Voix choisie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{voice?.name || 'Non définie'}</p>
            <Badge variant="secondary">
              {state.gender === 'male' ? 'Homme' : 'Femme'}
            </Badge>
            {voice && (
              <p className="text-sm text-muted-foreground">{voice.description}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modèle</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{MODEL_LABELS[state.model]}</p>
            <p className="text-sm text-muted-foreground">
              Température : {state.temperature.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {contextPreview && (
        <details className="rounded-md border p-4 bg-muted/30">
          <summary className="cursor-pointer font-medium">
            Contexte business enrichi (aperçu)
          </summary>
          <pre className="mt-3 text-xs whitespace-pre-wrap text-muted-foreground">
            {contextPreview}
            {state.enrichedContext && state.enrichedContext.split('\n').filter(Boolean).length > 5
              ? '\n…'
              : ''}
          </pre>
        </details>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt système (extrait)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-auto bg-muted p-3 rounded font-mono">
            {state.systemPrompt.slice(0, 600)}
            {state.systemPrompt.length > 600 ? '…' : ''}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
