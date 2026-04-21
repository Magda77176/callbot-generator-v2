'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CALLBOT_CONFIGS } from '@/lib/callbot-configs';
import { MODEL_LABELS, type BuilderState } from '@/lib/builder-types';
import { FRENCH_VOICES } from '@/lib/voices';

interface StepReviewProps {
  state: BuilderState;
}

export function StepReview({ state }: StepReviewProps) {
  if (!state.sector) return null;
  const template = CALLBOT_CONFIGS[state.sector];
  const voice = FRENCH_VOICES.find((v) => v.id === state.voiceId);

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
            <CardTitle className="text-base">Voix</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{voice?.name || 'Non définie'}</p>
            <p className="text-sm text-muted-foreground">{voice?.description}</p>
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
