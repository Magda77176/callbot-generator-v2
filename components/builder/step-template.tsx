'use client';

import { Check } from 'lucide-react';
import { CALLBOT_CONFIGS, type Sector } from '@/lib/callbot-configs';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SectorMeta {
  emoji: string;
  description: string;
  accent: string;
}

const SECTOR_META: Record<Sector, SectorMeta> = {
  restaurant: { emoji: '🍽️', description: 'Réservations, commandes à emporter, carte', accent: 'border-red-500' },
  coiffeur: { emoji: '✂️', description: 'RDV coupes, colorations, soins capillaires', accent: 'border-purple-500' },
  dentaire: { emoji: '🦷', description: 'RDV consultations, urgences, soins', accent: 'border-blue-500' },
  immobilier: { emoji: '🏠', description: 'Visites, estimations, qualification prospects', accent: 'border-amber-500' },
  ecommerce: { emoji: '📦', description: 'Support commandes, SAV, retours', accent: 'border-emerald-500' },
};

interface StepTemplateProps {
  selectedSector: Sector | null;
  onSelect: (sector: Sector) => void;
}

export function StepTemplate({ selectedSector, onSelect }: StepTemplateProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Choisissez un template</h2>
        <p className="text-muted-foreground mt-1">
          Chaque template définit la personnalité, les réponses et le ton du bot.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.keys(CALLBOT_CONFIGS) as Sector[]).map((sector) => {
          const config = CALLBOT_CONFIGS[sector];
          const meta = SECTOR_META[sector];
          const isSelected = selectedSector === sector;
          return (
            <Card
              key={sector}
              onClick={() => onSelect(sector)}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md border-2',
                isSelected ? `${meta.accent} shadow-md` : 'border-border',
              )}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <span className="text-3xl">{meta.emoji}</span>
                  <CardTitle className="mt-2">{config.name}</CardTitle>
                </div>
                {isSelected && <Check className="text-green-600" size={20} />}
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="secondary" className="capitalize">
                  {sector}
                </Badge>
                <p className="text-sm text-muted-foreground">{meta.description}</p>
                <Dialog>
                  <DialogTrigger
                    onClick={(e) => e.stopPropagation()}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Voir exemple
                  </DialogTrigger>
                  <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                      <DialogTitle>
                        {meta.emoji} {config.name} — {sector}
                      </DialogTitle>
                      <DialogDescription>Aperçu du message d&apos;accueil et du prompt.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold mb-1">Message d&apos;accueil</p>
                        <p className="text-muted-foreground italic">
                          {config.greeting.replace(/\{\{business_name\}\}/g, 'votre établissement')}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Prompt système (extrait)</p>
                        <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap max-h-64 overflow-auto">
                          {config.systemPrompt.slice(0, 600)}
                          {config.systemPrompt.length > 600 ? '…' : ''}
                        </pre>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
