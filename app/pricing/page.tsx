'use client';

import Link from 'next/link';
import { ArrowUpRight, Check, Phone } from 'lucide-react';
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
    tagline: 'Pour démarrer',
    features: ['200 min/mois inclus', 'Email + SMS', 'Google Calendar', 'Voix française'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 199,
    minutes: 500,
    overagePerMinute: 0.4,
    tagline: 'Le plus populaire',
    features: ['500 min/mois inclus', 'Tarif au-delà réduit', 'Enrichissement contextuel', 'Support prioritaire'],
  },
  {
    id: 'business',
    name: 'Business',
    monthly: 399,
    minutes: 1200,
    overagePerMinute: 0.3,
    tagline: 'Pour gros volumes',
    features: ['1200 min/mois inclus', 'Multi-bots inclus', 'Tarif au-delà optimal', 'Support dédié'],
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
    <main className="min-h-screen hero-bg">
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-default flex items-center justify-center">
              <Phone className="size-3.5 text-black" />
            </div>
            <span className="font-semibold tracking-tight uppercase">CallBot</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 uppercase text-xs tracking-widest">
            <Link href="/" className="text-muted-foreground hover:text-default transition-colors">
              Accueil
            </Link>
            <Link href="/pricing" className="hover:text-default transition-colors">
              Tarifs
            </Link>
          </nav>
          <Link href="/builder" className={buttonVariants({ size: 'sm' })}>
            Démarrer
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-20 pb-12 text-center">
        <div className="uppercase text-xs tracking-widest text-default mb-6">— Tarifs</div>
        <h1 className="display-massive">
          Combien <br /> ça <span className="text-default">coûte</span>
        </h1>
        <p className="mt-10 text-lg md:text-xl font-light max-w-xl mx-auto">
          Bougez les sliders ci-dessous. Le plan recommandé s&apos;adapte en temps réel à votre
          volume.
        </p>
      </section>

      {/* Simulator */}
      <section className="max-w-3xl mx-auto px-6 lg:px-12 py-10">
        <div className="border border-border bg-card rounded-md p-8 md:p-10 space-y-8">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <label htmlFor="calls" className="uppercase text-xs tracking-widest text-muted-foreground">
                Appels par mois
              </label>
              <span className="display-light text-4xl tabular-nums">{callsPerMonth}</span>
            </div>
            <input
              id="calls"
              type="range"
              min={10}
              max={500}
              step={5}
              value={callsPerMonth}
              onChange={(e) => setCallsPerMonth(Number.parseInt(e.target.value, 10))}
              className="w-full accent-[oklch(0.65_0.19_50)]"
            />
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>10</span>
              <span>500</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="duration"
                className="uppercase text-xs tracking-widest text-muted-foreground"
              >
                Durée moyenne par appel
              </label>
              <span className="display-light text-4xl tabular-nums">{avgMinutes} min</span>
            </div>
            <input
              id="duration"
              type="range"
              min={1}
              max={10}
              step={1}
              value={avgMinutes}
              onChange={(e) => setAvgMinutes(Number.parseInt(e.target.value, 10))}
              className="w-full accent-[oklch(0.65_0.19_50)]"
            />
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>1 min</span>
              <span>10 min</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-baseline justify-between">
            <span className="uppercase text-xs tracking-widest text-muted-foreground">
              Volume total
            </span>
            <span className="display-light text-4xl tabular-nums">
              {totalMinutes.toLocaleString('fr-FR')} <span className="text-base text-muted-foreground">min</span>
            </span>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
          {planCosts.map(({ plan, base, overage, overageMinutes, total }) => {
            const isRecommended = plan.id === recommendedId;
            return (
              <div
                key={plan.id}
                className={
                  isRecommended
                    ? 'relative border-2 border-default bg-card rounded-md p-8'
                    : 'relative border border-border bg-card rounded-md p-8 hover:border-default/40 transition-colors'
                }
              >
                {isRecommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-default text-black px-3 py-1 rounded uppercase tracking-widest font-semibold whitespace-nowrap">
                    Recommandé
                  </span>
                )}
                <div className="uppercase text-xs tracking-widest text-muted-foreground mb-2">
                  {plan.tagline}
                </div>
                <h3 className="display-section text-3xl mb-6">{plan.name}</h3>

                <div className="border-y border-border py-6 my-4">
                  <div className="display-massive text-5xl">{eur(plan.monthly)}</div>
                  <div className="uppercase text-xs tracking-widest text-muted-foreground mt-2">
                    par mois · {plan.overagePerMinute.toFixed(2)} €/min au-delà
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm font-light">
                      <Check className="size-4 text-default mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-5 border-t border-border space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="uppercase tracking-widest">Forfait</span>
                    <span className="tabular-nums">{eur(base)}</span>
                  </div>
                  {overageMinutes > 0 ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span className="uppercase tracking-widest">Dépass. ({overageMinutes} min)</span>
                      <span className="tabular-nums">{eur(overage)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-default">
                      <span className="uppercase tracking-widest">Sans dépassement</span>
                      <span className="tabular-nums">{eur(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2">
                    <span className="uppercase tracking-widest">Total</span>
                    <span className="tabular-nums display-light text-xl">{eur(total)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Impact */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          <div className="bg-default text-black rounded-md p-6 md:p-8 min-h-[200px] flex flex-col justify-between">
            <div className="size-4 rounded-full bg-black" />
            <div>
              <div className="display-section text-3xl md:text-5xl normal-case">{eur(costPerCall)}</div>
              <div className="text-[11px] uppercase tracking-widest mt-2 opacity-80">
                Coût par appel
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-md p-6 md:p-8 min-h-[200px] flex flex-col justify-between">
            <div className="size-4 rounded-full bg-default" />
            <div>
              <div className="display-section text-3xl md:text-5xl normal-case line-through text-muted-foreground/60">
                {eur(HUMAN_RECEPTIONIST_PER_MONTH_EUR)}
              </div>
              <div className="text-[11px] uppercase tracking-widest mt-2 text-muted-foreground">
                Standardiste humain
              </div>
            </div>
          </div>
          <div className="bg-[#4a4a4a] text-white rounded-md p-6 md:p-8 min-h-[200px] flex flex-col justify-between col-span-2 md:col-span-1">
            <div className="size-4 rounded-full bg-default" />
            <div>
              <div className="display-section text-3xl md:text-5xl normal-case">{eur(savings)}</div>
              <div className="text-[11px] uppercase tracking-widest mt-2 opacity-80">
                Économie par mois
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-24 text-center">
        <p className="text-sm text-muted-foreground mb-6">
          + frais d&apos;installation unique de <strong className="text-foreground">{eur(SETUP_FEE_EUR)}</strong>{' '}
          (configuration sur-mesure, enrichissement, tests).
        </p>
        <Link href="/builder" className={buttonVariants({ size: 'lg' })}>
          Démarrer maintenant
          <ArrowUpRight className="size-4" />
        </Link>
        <p className="mt-4 text-xs text-muted-foreground uppercase tracking-widest">
          Sans engagement · Résiliable à la fin de chaque mois
        </p>
      </section>

      {/* Footer */}
      <footer className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 border-t border-border">
        <div className="space-y-6">
          <a
            href="mailto:sullivan.magdaleone@gmail.com"
            className="display-section block hover:text-default transition-colors"
          >
            sullivan.magdaleone@gmail.com
          </a>
          <div className="flex justify-between items-center pt-6 border-t border-border text-xs text-muted-foreground">
            <span>© CallBot 2026 — Standards téléphoniques IA</span>
            <Link href="/" className="hover:text-default transition-colors uppercase tracking-widest">
              Accueil ↑
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
