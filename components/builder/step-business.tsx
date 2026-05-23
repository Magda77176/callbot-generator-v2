'use client';

import { Check, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <label
        htmlFor={id}
        className="block uppercase text-xs tracking-widest text-muted-foreground"
      >
        {label}
        {required && <span className="text-default ml-1">*</span>}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-background border-border h-11 rounded-md"
      />
      {helper && <p className="text-xs text-muted-foreground font-light">{helper}</p>}
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

  const detectedLabel = detectedType ? DETECTED_TYPE_LABELS[detectedType] || detectedType : null;

  return (
    <div className="space-y-10">
      <div>
        <div className="uppercase text-xs tracking-widest text-default mb-3">— Étape 02</div>
        <h2 className="display-section">Informations établissement</h2>
        <p className="text-muted-foreground mt-4 font-light max-w-xl">
          Le bot s&apos;appuie sur ces informations pour répondre avec précision et tenir un
          discours crédible au téléphone.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          id="name"
          label="Nom de l'établissement"
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

      <div className="border border-border rounded-md bg-card p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="uppercase text-xs tracking-widest text-default mb-2">
              Enrichissement automatique
            </div>
            <p className="text-sm font-light text-muted-foreground max-w-xl leading-relaxed">
              On interroge DataForSEO (Google My Business), on scrape les sources additionnelles
              (site, annuaires, annonces immo), puis Claude Sonnet synthétise tout en contexte
              business.
            </p>
          </div>
        </div>

        <Field
          id="primary"
          label="Nom ou lien de votre établissement"
          value={primarySource}
          onChange={(v) => onChange({ primarySource: v })}
          placeholder="Le Ti Taurus, https://maps.google.com/... ou https://mon-site.fr"
          helper="Acceptés : nom seul, Google Maps, Pages Jaunes, TripAdvisor, TheFork, site web…"
        />

        {sector === 'restaurant' && (
          <div className="space-y-2">
            <label
              htmlFor="manual-menu"
              className="block uppercase text-xs tracking-widest text-muted-foreground"
            >
              Menu / carte (optionnel)
            </label>
            <Textarea
              id="manual-menu"
              value={manualMenu}
              onChange={(e) => onChange({ manualMenu: e.target.value })}
              rows={8}
              placeholder={`Ex.\nEntrées :\n- Accras de morue — 8 €\n- Boudin créole — 9 €\n\nPlats :\n- Colombo de poulet — 18 €\n- Langouste grillée — 38 €\n\nDesserts :\n- Blanc-manger coco — 7 €`}
              className="bg-background border-border font-mono text-sm rounded-md"
            />
            <p className="text-xs text-muted-foreground font-light">
              Google ne donne pas le menu via API. Si vous le collez ici, le bot peut citer les
              plats et leurs prix.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            id="facebook"
            label="Facebook"
            type="url"
            value={businessInfo.facebook || ''}
            onChange={(v) => update('facebook', v)}
            placeholder="https://facebook.com/..."
          />
          <Field
            id="instagram"
            label="Instagram"
            type="url"
            value={businessInfo.instagram || ''}
            onChange={(v) => update('instagram', v)}
            placeholder="https://instagram.com/..."
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground font-light uppercase tracking-widest">
            {isLoading && 'Analyse en cours · 5 à 40 secondes'}
            {!isLoading && enrichmentStatus === 'done' && 'Contexte synthétisé · relançable'}
            {!isLoading && enrichmentStatus !== 'done' && 'En attente d\'analyse'}
          </p>
          <Button
            type="button"
            variant={enrichmentStatus === 'done' ? 'outline' : 'default'}
            onClick={handleEnrich}
            disabled={isLoading || !canEnrich}
            className="shrink-0 btn-elevated"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Analyse…
              </>
            ) : enrichmentStatus === 'done' ? (
              <>
                <RefreshCw size={16} />
                Relancer
              </>
            ) : (
              <>
                <Search size={16} />
                Enrichir
              </>
            )}
          </Button>
        </div>

        {detectedLabel && !isLoading && (
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-default">
            <span className="size-1.5 rounded-full bg-default" />
            Détecté : {detectedLabel}
          </div>
        )}

        {sourcesStatus.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sourcesStatus.map((s, i) => (
              <div
                key={`${s.type}-${i}`}
                title={s.error || s.details}
                className={
                  'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded uppercase tracking-wider font-medium ' +
                  (s.ok
                    ? 'bg-default/15 text-default ring-1 ring-default/30'
                    : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30')
                }
              >
                {s.ok ? <Check className="size-3" /> : <X className="size-3" />}
                {s.type}
                {s.details && <span className="opacity-70">· {s.details}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {enrichedContext && (
        <div className="border border-border rounded-md bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="uppercase text-xs tracking-widest text-default">
              Synthèse du contexte business
            </div>
            {cost !== null && (
              <div className="text-xs text-muted-foreground font-mono">
                Coût DataForSEO · ${cost.toFixed(4)}
              </div>
            )}
          </div>
          <Textarea
            value={enrichedContext}
            readOnly
            rows={14}
            className="bg-background border-border text-sm font-light leading-relaxed rounded-md"
          />
        </div>
      )}
    </div>
  );
}
