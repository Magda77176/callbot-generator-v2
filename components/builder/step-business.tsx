'use client';

import { Loader2, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EnrichmentStatus } from '@/lib/builder-types';
import type { BusinessInfo, Sector } from '@/lib/callbot-configs';

const DETECTED_TYPE_LABELS: Record<string, string> = {
  business_name: 'Nom de commerce',
  google_maps: 'Google Maps',
  pages_jaunes: 'Pages Jaunes',
  tripadvisor: 'TripAdvisor',
  thefork: 'TheFork',
  yelp: 'Yelp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  website: 'Site web',
  directory_other: 'Annuaire',
  unknown: 'Inconnu',
};

interface SourceDisplay {
  type: string;
  ok: boolean;
  details?: string;
  error?: string;
}

interface StepBusinessPatch {
  businessInfo?: BusinessInfo;
  primarySource?: string;
  manualMenu?: string;
  enrichedContext?: string;
  enrichmentStatus?: EnrichmentStatus;
  detectedType?: string;
}

interface StepBusinessProps {
  sector: Sector | null;
  businessInfo: BusinessInfo;
  primarySource: string;
  manualMenu: string;
  enrichedContext?: string;
  enrichmentStatus: EnrichmentStatus;
  detectedType?: string;
  onChange: (patch: StepBusinessPatch) => void;
}

interface FieldProps {
  id: keyof BusinessInfo | 'primary';
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'text' | 'tel' | 'url';
  placeholder?: string;
  helper?: string;
}

function Field({ id, label, value, onChange, required, type = 'text', placeholder, helper }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

export function StepBusiness({
  sector,
  businessInfo,
  primarySource,
  manualMenu,
  enrichedContext,
  enrichmentStatus,
  detectedType,
  onChange,
}: StepBusinessProps) {
  const [sourcesStatus, setSourcesStatus] = useState<SourceDisplay[]>([]);
  const [cost, setCost] = useState<number | null>(null);

  const update = (key: keyof BusinessInfo, value: string) =>
    onChange({ businessInfo: { ...businessInfo, [key]: value } });

  const isLoading = enrichmentStatus === 'loading';
  const canEnrich = Boolean(businessInfo.name?.trim() || primarySource.trim());

  const handleEnrich = async () => {
    if (!canEnrich) {
      toast.error("Renseigne au moins le nom de l'établissement ou un lien");
      return;
    }

    onChange({ enrichmentStatus: 'loading' });
    setSourcesStatus([]);
    setCost(null);

    try {
      const res = await fetch('/api/enrich-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector,
          businessName: businessInfo.name,
          primary: primarySource,
          facebook: businessInfo.facebook,
          instagram: businessInfo.instagram,
          menu: manualMenu,
        }),
      });
      const data = (await res.json()) as {
        success: boolean;
        contextSummary?: string;
        detectedType?: string;
        error?: string;
        sourcesStatus?: SourceDisplay[];
        cost?: { dataforseo: number };
      };

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setSourcesStatus(data.sourcesStatus || []);
      setCost(data.cost?.dataforseo ?? null);

      if (!data.success) {
        throw new Error('Enrichissement incomplet — voir les statuts sources');
      }

      onChange({
        enrichedContext: data.contextSummary || '',
        detectedType: data.detectedType,
        enrichmentStatus: 'done',
      });
      toast.success('Contexte business enrichi');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Échec de l'enrichissement : ${msg}`);
      onChange({ enrichmentStatus: 'error' });
    }
  };

  const detectedLabel = detectedType
    ? DETECTED_TYPE_LABELS[detectedType] || detectedType
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Informations établissement</h2>
        <p className="text-muted-foreground mt-1">
          Ces informations seront injectées dans le bot pour des réponses personnalisées.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          id="name"
          label="Nom établissement"
          required
          value={businessInfo.name || ''}
          onChange={(v) => update('name', v)}
          placeholder="La Bella Vita"
        />
        <Field
          id="address"
          label="Adresse"
          value={businessInfo.address || ''}
          onChange={(v) => update('address', v)}
          placeholder="12 rue de la Paix, Paris"
        />
        <Field
          id="phone"
          label="Téléphone"
          type="tel"
          value={businessInfo.phone || ''}
          onChange={(v) => update('phone', v)}
          placeholder="01 23 45 67 89"
        />
        <Field
          id="hours"
          label="Horaires"
          value={businessInfo.hours || ''}
          onChange={(v) => update('hours', v)}
          placeholder="Lun-Sam 12h-22h"
        />
      </div>

      <div className="space-y-4 pt-6 border-t">
        <div>
          <h3 className="font-semibold">Enrichissement automatique du contexte</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Colle un nom ou un lien. On interroge DataForSEO (Google My Business) et on scrape
            les sources additionnelles, puis Claude Sonnet synthétise le tout.
          </p>
        </div>

        <Field
          id="primary"
          label="Nom ou lien de votre établissement"
          value={primarySource}
          onChange={(v) => onChange({ primarySource: v })}
          placeholder="Le Ti Taurus ou https://maps.google.com/... ou https://monresto.fr"
          helper="Acceptés : nom seul, Google Maps, Pages Jaunes, TripAdvisor, TheFork, site web..."
        />

        {sector === 'restaurant' && (
          <div className="space-y-2">
            <Label htmlFor="manual-menu">
              Menu / carte (optionnel — collez votre carte ici)
            </Label>
            <Textarea
              id="manual-menu"
              value={manualMenu}
              onChange={(e) => onChange({ manualMenu: e.target.value })}
              rows={8}
              placeholder={`Ex.\nEntrées :\n- Accras de morue — 8 €\n- Boudin créole — 9 €\n\nPlats :\n- Colombo de poulet — 18 €\n- Langouste grillée — 38 €\n- Brochette de saint-jacques — 24 €\n\nDesserts :\n- Blanc-manger coco — 7 €`}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Google ne donne pas le menu via API. Si vous le collez ici, le bot pourra citer
              les plats et leurs prix au lieu de rester vague.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            id="facebook"
            label="Facebook (optionnel)"
            type="url"
            value={businessInfo.facebook || ''}
            onChange={(v) => update('facebook', v)}
            placeholder="https://facebook.com/..."
          />
          <Field
            id="instagram"
            label="Instagram (optionnel)"
            type="url"
            value={businessInfo.instagram || ''}
            onChange={(v) => update('instagram', v)}
            placeholder="https://instagram.com/..."
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-muted-foreground">
            {isLoading && 'Analyse DataForSEO + synthèse Claude — 5 à 40 secondes.'}
            {!isLoading &&
              enrichmentStatus === 'done' &&
              'Contexte synthétisé. Tu peux relancer si tu changes les sources.'}
            {!isLoading && enrichmentStatus !== 'done' && 'Aucune analyse en cours.'}
          </p>
          <Button
            type="button"
            variant={enrichmentStatus === 'done' ? 'outline' : 'default'}
            onClick={handleEnrich}
            disabled={isLoading || !canEnrich}
            className="shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                Analyse en cours…
              </>
            ) : enrichmentStatus === 'done' ? (
              <>
                <RefreshCw className="mr-2" size={16} />
                Relancer
              </>
            ) : (
              <>
                <Search className="mr-2" size={16} />
                Enrichir le contexte
              </>
            )}
          </Button>
        </div>

        {detectedLabel && !isLoading && (
          <div>
            <Badge variant="secondary">Détecté : {detectedLabel}</Badge>
          </div>
        )}

        {sourcesStatus.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sourcesStatus.map((s, i) => (
              <Badge
                key={`${s.type}-${i}`}
                className={
                  s.ok
                    ? 'bg-green-600 text-white hover:bg-green-600'
                    : 'bg-amber-500 text-white hover:bg-amber-500'
                }
                title={s.error || s.details}
              >
                {s.ok ? '✓' : '⚠'} {s.type}
                {s.details && <span className="ml-1 opacity-80">— {s.details}</span>}
                {s.error && <span className="ml-1 opacity-80">— {s.error}</span>}
              </Badge>
            ))}
          </div>
        )}

        {enrichedContext && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Synthèse du contexte business</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea value={enrichedContext} readOnly rows={12} className="text-sm" />
              {cost !== null && (
                <p className="text-xs text-muted-foreground text-right">
                  Coût DataForSEO : ${cost.toFixed(4)}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
