'use client';

import Link from 'next/link';
import { ArrowRight, Check, Phone, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';

interface Plan {
  id: string;
  name: string;
  monthly: number;
  minutes: number;
  overagePerMinute: number;
  tagline: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 99,
    minutes: 200,
    overagePerMinute: 0.5,
    tagline: 'Pour démarrer en douceur',
    features: ['200 min/mois inclus', 'Email + SMS de confirmation', 'Intégration Google Calendar', 'Voix française naturelle'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 199,
    minutes: 500,
    overagePerMinute: 0.4,
    tagline: 'Pour la majorité des établissements',
    features: ['500 min/mois inclus', 'Tarif au-delà réduit', 'Enrichissement contextuel automatique', 'Support prioritaire'],
  },
  {
    id: 'business',
    name: 'Business',
    monthly: 399,
    minutes: 1200,
    overagePerMinute: 0.3,
    tagline: 'Pour les gros volumes',
    features: ['1200 min/mois inclus', 'Tarif au-delà optimal', 'Multi-bots inclus', 'Support dédié + onboarding'],
  },
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
    <main className="min-h-screen">
      {/* Header */}
      <header className="container mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center group-hover:ring-glow transition-shadow">
            <Phone className="size-4 text-primary" />
          </div>
          <span className="font-semibold tracking-tight">CallBot</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
          >
            Accueil
          </Link>
          <Link href="/builder" className={buttonVariants({ size: 'sm' })}>
            Démarrer
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto max-w-4xl px-6 pt-12 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground mb-6">
          <Sparkles className="size-3 text-primary" />
          Estimation transparente · Sans engagement
        </div>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-balance">
          Combien votre CallBot
          <br />
          <span className="text-gradient">va vous coûter ?</span>
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          Bougez les sliders pour estimer votre tarif mensuel. Le plan recommandé s&apos;adapte en
          temps réel.
        </p>
      </section>

      {/* Simulator */}
      <section className="container mx-auto max-w-3xl px-6 pb-10">
        <div className="glass rounded-3xl border border-border p-8 space-y-8">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <label htmlFor="calls" className="text-base font-medium">
                Appels reçus par mois
              </label>
              <span className="font-mono text-3xl font-bold tabular-nums">{callsPerMonth}</span>
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
              <label htmlFor="duration" className="text-base font-medium">
                Durée moyenne par appel
              </label>
              <span className="font-mono text-3xl font-bold tabular-nums">{avgMinutes} min</span>
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

          <div className="pt-2 border-t border-border flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Volume mensuel total</span>
            <span className="text-3xl font-semibold tabular-nums">
              {totalMinutes.toLocaleString('fr-FR')}
              <span className="text-base font-normal text-muted-foreground"> min</span>
            </span>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="container mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planCosts.map(({ plan, base, overage, overageMinutes, total }) => {
            const isRecommended = plan.id === recommendedId;
            return (
              <div
                key={plan.id}
                className={
                  isRecommended
                    ? 'relative rounded-3xl border border-primary/50 bg-card/70 backdrop-blur p-7 ring-glow'
                    : 'relative rounded-3xl border border-border bg-card/40 p-7 hover:border-primary/30 transition-colors'
                }
              >
                {isRecommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                    Recommandé pour vous
                  </span>
                )}
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{plan.tagline}</div>
                  <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
                </div>

                <div className="mt-6">
                  <span className="text-5xl font-semibold tracking-tight">{eur(plan.monthly)}</span>
                  <span className="text-sm text-muted-foreground"> /mois</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Puis {plan.overagePerMinute.toFixed(2)} €/min au-delà
                </p>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 pt-5 border-t border-border space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Forfait</span>
                    <span className="tabular-nums">{eur(base)}</span>
                  </div>
                  {overageMinutes > 0 ? (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Dépassement ({overageMinutes} min)</span>
                      <span className="tabular-nums">{eur(overage)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>Aucun dépassement</span>
                      <span className="tabular-nums">{eur(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2">
                    <span>Total mensuel</span>
                    <span className="tabular-nums text-xl">{eur(total)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Impact summary */}
      <section className="container mx-auto max-w-5xl px-6 py-10">
        <div className="glass rounded-3xl border border-border p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Coût moyen par appel
            </p>
            <p className="text-4xl font-semibold tabular-nums">{eur(costPerCall)}</p>
            <p className="text-xs text-muted-foreground mt-1">avec le plan {cheapest.plan.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Standardiste humain équivalent
            </p>
            <p className="text-4xl font-semibold tabular-nums line-through text-muted-foreground/60">
              {eur(HUMAN_RECEPTIONIST_PER_MONTH_EUR)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">par mois, temps partiel</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Vous économisez
            </p>
            <p className="text-4xl font-semibold tabular-nums text-emerald-400">{eur(savings)}</p>
            <p className="text-xs text-muted-foreground mt-1">par mois</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground mb-5">
          + frais d&apos;installation unique de <strong className="text-foreground">{eur(SETUP_FEE_EUR)}</strong>{' '}
          (configuration sur-mesure, enrichissement de votre fiche, tests)
        </p>
        <Link href="/builder" className={buttonVariants({ size: 'lg' })}>
          Démarrer maintenant
          <ArrowRight className="size-4" />
        </Link>
        <p className="mt-4 text-xs text-muted-foreground">
          Sans engagement · Résiliable à la fin de chaque mois
        </p>
      </section>

      {/* Footer */}
      <footer className="container mx-auto max-w-6xl px-6 py-10 border-t border-border mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
              <Phone className="size-3 text-primary" />
            </div>
            <span>CallBot · Standards téléphoniques IA</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              Accueil
            </Link>
            <Link href="/builder" className="hover:text-foreground transition-colors">
              Démarrer
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
