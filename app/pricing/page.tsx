'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface Plan {
  id: string;
  name: string;
  monthly: number;
  minutes: number;
  overagePerMinute: number;
}

const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', monthly: 99, minutes: 200, overagePerMinute: 0.5 },
  { id: 'pro', name: 'Pro', monthly: 199, minutes: 500, overagePerMinute: 0.4 },
  { id: 'business', name: 'Business', monthly: 399, minutes: 1200, overagePerMinute: 0.3 },
];

const SETUP_FEE_EUR = 149;
const HUMAN_RECEPTIONIST_PER_MONTH_EUR = 1800;

interface PlanCost {
  plan: Plan;
  base: number;
  overage: number;
  overageMinutes: number;
  total: number;
}

function computePlanCost(plan: Plan, totalMinutes: number): PlanCost {
  const overageMinutes = Math.max(0, totalMinutes - plan.minutes);
  const overage = overageMinutes * plan.overagePerMinute;
  return { plan, base: plan.monthly, overage, overageMinutes, total: plan.monthly + overage };
}

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);

export default function PricingPage() {
  const [callsPerMonth, setCallsPerMonth] = useState(80);
  const [avgMinutes, setAvgMinutes] = useState(3);

  const { totalMinutes, planCosts, recommendedId, cheapest, costPerCall, savings } = useMemo(() => {
    const totalMinutes = callsPerMonth * avgMinutes;
    const planCosts = PLANS.map((p) => computePlanCost(p, totalMinutes));
    const sorted = [...planCosts].sort((a, b) => a.total - b.total);
    const cheapest = sorted[0];
    const recommendedId = cheapest.plan.id;
    const costPerCall = callsPerMonth > 0 ? cheapest.total / callsPerMonth : 0;
    const savings = Math.max(0, HUMAN_RECEPTIONIST_PER_MONTH_EUR - cheapest.total);
    return { totalMinutes, planCosts, recommendedId, cheapest, costPerCall, savings };
  }, [callsPerMonth, avgMinutes]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-12 space-y-10">
      <header className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          Combien votre CallBot va vous coûter ?
        </h1>
        <p className="text-muted-foreground text-lg">
          Estimez votre tarif mensuel selon votre volume d&apos;appels entrants.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Votre activité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="calls" className="text-base">
                Appels reçus par mois
              </Label>
              <span className="font-mono text-2xl font-bold tabular-nums">{callsPerMonth}</span>
            </div>
            <input
              id="calls"
              type="range"
              min={10}
              max={500}
              step={5}
              value={callsPerMonth}
              onChange={(e) => setCallsPerMonth(Number.parseInt(e.target.value, 10))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10</span>
              <span>500</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="duration" className="text-base">
                Durée moyenne par appel
              </Label>
              <span className="font-mono text-2xl font-bold tabular-nums">{avgMinutes} min</span>
            </div>
            <input
              id="duration"
              type="range"
              min={1}
              max={10}
              step={1}
              value={avgMinutes}
              onChange={(e) => setAvgMinutes(Number.parseInt(e.target.value, 10))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 min</span>
              <span>10 min</span>
            </div>
          </div>

          <div className="pt-2 border-t flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Volume mensuel total</span>
            <span className="text-3xl font-bold">
              {totalMinutes.toLocaleString('fr-FR')} <span className="text-base font-normal text-muted-foreground">minutes</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planCosts.map(({ plan, base, overage, overageMinutes, total }) => {
          const isRecommended = plan.id === recommendedId;
          return (
            <Card
              key={plan.id}
              className={
                isRecommended ? 'border-primary border-2 shadow-md relative' : 'relative'
              }
            >
              {isRecommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-semibold">
                  Recommandé pour vous
                </span>
              )}
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div>
                  <span className="text-4xl font-bold">{eur(plan.monthly)}</span>
                  <span className="text-sm text-muted-foreground"> /mois</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.minutes} min incluses · {plan.overagePerMinute.toFixed(2)} €/min au-delà
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Forfait</span>
                  <span className="tabular-nums">{eur(base)}</span>
                </div>
                {overageMinutes > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Dépassement ({overageMinutes} min)
                    </span>
                    <span className="tabular-nums">{eur(overage)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Aucun dépassement</span>
                    <span className="tabular-nums">{eur(0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total mensuel</span>
                  <span className="tabular-nums text-lg">{eur(total)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Coût moyen par appel
            </p>
            <p className="text-3xl font-bold tabular-nums">{eur(costPerCall)}</p>
            <p className="text-xs text-muted-foreground mt-1">avec le plan {cheapest.plan.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Standard humain équivalent
            </p>
            <p className="text-3xl font-bold tabular-nums line-through text-muted-foreground">
              {eur(HUMAN_RECEPTIONIST_PER_MONTH_EUR)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">par mois, temps partiel</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Vous économisez
            </p>
            <p className="text-3xl font-bold tabular-nums text-green-600">{eur(savings)}</p>
            <p className="text-xs text-muted-foreground mt-1">par mois</p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-4 pt-2">
        <p className="text-sm text-muted-foreground">
          + frais d&apos;installation unique de <strong>{eur(SETUP_FEE_EUR)}</strong> (configuration
          sur-mesure, enrichissement de votre fiche établissement, tests)
        </p>
        <Link href="/builder" className={buttonVariants({ size: 'lg' })}>
          Démarrer maintenant
        </Link>
        <p className="text-xs text-muted-foreground">
          Pas d&apos;engagement. Vous pouvez résilier à la fin de chaque mois.
        </p>
      </div>

      <footer className="text-center text-xs text-muted-foreground pt-8 border-t">
        Disponible 24/7. Voix française naturelle. Intégration agenda Google + email + SMS de
        confirmation inclus.
      </footer>
    </main>
  );
}
