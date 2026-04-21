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
import type { BusinessInfo } from '@/lib/callbot-configs';

interface SourceDisplay {
  key: 'website' | 'gmb' | 'facebook' | 'instagram';
  label: string;
  fetched: boolean;
  error?: string;
}

interface StepBusinessPatch {
  businessInfo?: BusinessInfo;
  enrichedContext?: string;
  enrichmentStatus?: EnrichmentStatus;
}

interface StepBusinessProps {
  businessInfo: BusinessInfo;
  enrichedContext?: string;
  enrichmentStatus: EnrichmentStatus;
  onChange: (patch: StepBusinessPatch) => void;
}

interface FieldProps {
  id: keyof BusinessInfo;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'text' | 'tel' | 'url';
  placeholder?: string;
}

function Field({ id, label, value, onChange, required, type = 'text', placeholder }: FieldProps) {
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
    </div>
  );
}

export function StepBusiness({
  businessInfo,
  enrichedContext,
  enrichmentStatus,
  onChange,
}: StepBusinessProps) {
  const [sourcesStatus, setSourcesStatus] = useState<SourceDisplay[]>([]);

  const update = (key: keyof BusinessInfo, value: string) =>
    onChange({ businessInfo: { ...businessInfo, [key]: value } });

  const isLoading = enrichmentStatus === 'loading';

  const handleEnrich = async () => {
    if (!businessInfo.name?.trim()) {
      toast.error('Le nom de l\'établissement est requis avant enrichissement');
      return;
    }
    const hasSource =
      businessInfo.website ||
      businessInfo.gmb_url ||
      businessInfo.facebook ||
      businessInfo.instagram;
    if (!hasSource) {
      toast.error('Renseigne au moins un lien (site, GMB, Facebook ou Instagram)');
      return;
    }

    onChange({ enrichmentStatus: 'loading' });
    setSourcesStatus([]);

    try {
      const res = await fetch('/api/enrich-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessInfo.name,
          sources: {
            website: businessInfo.website,
            gmb_url: businessInfo.gmb_url,
            facebook: businessInfo.facebook,
            instagram: businessInfo.instagram,
          },
        }),
      });
      const data = (await res.json()) as {
        success: boolean;
        contextSummary?: string;
        error?: string;
        sources?: Record<string, { fetched: boolean; error?: string }>;
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const statuses: SourceDisplay[] = [];
      const srcs = data.sources ?? {};
      const labelMap: Record<SourceDisplay['key'], string> = {
        website: 'Site web',
        gmb: 'Google My Business',
        facebook: 'Facebook',
        instagram: 'Instagram',
      };
      (['website', 'gmb', 'facebook', 'instagram'] as const).forEach((k) => {
        const s = srcs[k];
        if (s) statuses.push({ key: k, label: labelMap[k], fetched: s.fetched, error: s.error });
      });

      setSourcesStatus(statuses);
      onChange({
        enrichedContext: data.contextSummary || '',
        enrichmentStatus: 'done',
      });
      toast.success('Contexte business enrichi');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Échec de l'enrichissement : ${msg}`);
      onChange({ enrichmentStatus: 'error' });
    }
  };

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
        <Field
          id="website"
          label="Site web"
          type="url"
          value={businessInfo.website || ''}
          onChange={(v) => update('website', v)}
          placeholder="https://..."
        />
        <Field
          id="gmb_url"
          label="Google My Business"
          type="url"
          value={businessInfo.gmb_url || ''}
          onChange={(v) => update('gmb_url', v)}
          placeholder="https://maps.app.goo.gl/..."
        />
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

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Enrichissement automatique du contexte</h3>
            <p className="text-sm text-muted-foreground">
              Claude Sonnet analyse le site web, Google My Business et les réseaux pour fournir un
              contexte business réel au bot. Facultatif mais fortement recommandé.
            </p>
          </div>
          <Button
            type="button"
            variant={enrichmentStatus === 'done' ? 'outline' : 'default'}
            onClick={handleEnrich}
            disabled={isLoading}
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

        {isLoading && (
          <p className="text-sm text-muted-foreground italic">
            Scraping des sources + synthèse Claude Sonnet — peut prendre 5 à 30 secondes.
          </p>
        )}

        {sourcesStatus.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sourcesStatus.map((s) => (
              <Badge
                key={s.key}
                className={
                  s.fetched
                    ? 'bg-green-600 text-white hover:bg-green-600'
                    : 'bg-amber-500 text-white hover:bg-amber-500'
                }
                title={s.error}
              >
                {s.fetched ? '✓' : '⚠'} {s.label}
              </Badge>
            ))}
          </div>
        )}

        {enrichedContext && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Synthèse du contexte business</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={enrichedContext}
                readOnly
                rows={12}
                className="text-sm font-normal"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
