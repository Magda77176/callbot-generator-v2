'use client';

import { Check, Eye, Home, Scissors, ShoppingBag, Stethoscope, UtensilsCrossed } from 'lucide-react';
import type { ComponentType } from 'react';
import { CALLBOT_CONFIGS, type Sector } from '@/lib/callbot-configs';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SectorMeta {
  icon: ComponentType<{ className?: string }>;
  description: string;
  capabilities: string[];
}

const SECTOR_META: Record<Sector, SectorMeta> = {
  restaurant: {
    icon: UtensilsCrossed,
    description: 'Réservations, commandes à emporter, infos menu et horaires',
    capabilities: ['Réservation', 'Livraison', 'Carte'],
  },
  coiffeur: {
    icon: Scissors,
    description: 'Prise de RDV par prestation, stylistes, annulations',
    capabilities: ['Prise de RDV', 'Tarifs', 'Annulation'],
  },
  dentaire: {
    icon: Stethoscope,
    description: 'Tri urgences, RDV consultations, renseignements soins',
    capabilities: ['Urgences', 'RDV', 'Mutuelle'],
  },
  immobilier: {
    icon: Home,
    description: 'Qualification, proposition de biens, booking visites',
    capabilities: ['Qualification', 'Proposition', 'Visite'],
  },
  ecommerce: {
    icon: ShoppingBag,
    description: 'Suivi commande, retours, produits défectueux, avant-vente',
    capabilities: ['Suivi commande', 'SAV', 'Retours'],
  },
};

interface StepTemplateProps {
  selectedSector: Sector | null;
  onSelect: (sector: Sector) => void;
}

export function StepTemplate({ selectedSector, onSelect }: StepTemplateProps) {
  return (
    <div className="space-y-10">
      <div>
        <div className="uppercase text-xs tracking-widest text-default mb-3">— Étape 01</div>
        <h2 className="display-section">Choisissez un template</h2>
        <p className="text-muted-foreground mt-4 font-light max-w-xl">
          Chaque persona est calibré pour son métier : protocole, ton, outils. Le bot est prêt à
          partir, vous l&apos;ajustez ensuite.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {(Object.keys(CALLBOT_CONFIGS) as Sector[]).map((sector, idx) => {
          const config = CALLBOT_CONFIGS[sector];
          const meta = SECTOR_META[sector];
          const Icon = meta.icon;
          const isSelected = selectedSector === sector;
          return (
            <button
              key={sector}
              onClick={() => onSelect(sector)}
              type="button"
              className={
                'group text-left rounded-md p-6 border transition-all ' +
                (isSelected
                  ? 'border-default bg-default/5 ring-2 ring-default'
                  : 'border-border bg-card hover:border-default/40')
              }
            >
              <div className="flex items-start justify-between mb-6">
                <div
                  className={
                    'size-12 rounded-md flex items-center justify-center transition-colors ' +
                    (isSelected
                      ? 'bg-default text-black'
                      : 'bg-background border border-border group-hover:border-default/40')
                  }
                >
                  <Icon className="size-5" />
                </div>
                {isSelected ? (
                  <Check className="size-5 text-default" />
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">
                    0{idx + 1}
                  </span>
                )}
              </div>
              <div className="display-light text-xl uppercase mb-1">{sector}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
                {config.name}
              </div>
              <p className="text-sm font-light text-muted-foreground leading-relaxed mb-5">
                {meta.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {meta.capabilities.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] uppercase tracking-wider font-medium bg-background border border-border px-2 py-0.5 rounded"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <Dialog>
                <DialogTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-default hover:underline"
                >
                  <Eye className="size-3" />
                  Voir l&apos;exemple
                </DialogTrigger>
                <DialogContent
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-2xl bg-card border-border"
                >
                  <DialogHeader>
                    <DialogTitle className="display-light text-2xl uppercase">
                      {sector} — {config.name}
                    </DialogTitle>
                    <DialogDescription className="uppercase text-xs tracking-widest">
                      Aperçu du message d&apos;accueil et du prompt système
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="uppercase text-xs tracking-widest text-default mb-2">
                        Message d&apos;accueil
                      </div>
                      <p className="text-muted-foreground italic font-light">
                        {config.greeting.replace(/\{\{business_name\}\}/g, 'votre établissement')}
                      </p>
                    </div>
                    <div>
                      <div className="uppercase text-xs tracking-widest text-default mb-2">
                        Prompt système (extrait)
                      </div>
                      <pre className="bg-background border border-border p-4 rounded text-xs whitespace-pre-wrap max-h-64 overflow-auto font-mono">
                        {config.systemPrompt.slice(0, 800)}
                        {config.systemPrompt.length > 800 ? '…' : ''}
                      </pre>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </button>
          );
        })}
      </div>
    </div>
  );
}
