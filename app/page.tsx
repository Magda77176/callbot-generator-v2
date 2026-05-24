import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Calendar,
  ChevronDown,
  Home,
  MessageSquare,
  Phone,
  Plus,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { CountUp } from '@/components/count-up';
import { HomeDemoCall } from '@/components/home-demo-call';

interface NumberCard {
  tone: 'orange' | 'dark' | 'grey' | 'light';
  label: string;
  count?: number;
  suffix?: string;
  static?: string;
  subtle?: boolean;
}

const NUMBERS: NumberCard[] = [
  { tone: 'orange', label: 'Faits & chiffres', subtle: true },
  { tone: 'dark', label: 'Secteurs supportés', count: 5, suffix: '+' },
  { tone: 'grey', label: 'Disponibilité', static: '24/7' },
  { tone: 'light', label: 'À partir de', count: 99, suffix: '€' },
];

const SERVICES = [
  { n: '01', title: 'Réservations & RDV', icon: Calendar },
  { n: '02', title: 'Qualification de leads', icon: Sparkles },
  { n: '03', title: 'Synchronisation Google Calendar', icon: Bot },
  { n: '04', title: 'Notifications email & SMS', icon: MessageSquare },
];

const SECTORS = [
  { icon: UtensilsCrossed, name: 'Restaurant', persona: 'Marco' },
  { icon: Home, name: 'Immobilier', persona: 'Alex' },
  { icon: Scissors, name: 'Coiffeur', persona: 'Léa' },
  { icon: Stethoscope, name: 'Dentaire', persona: 'Tom' },
  { icon: ShoppingBag, name: 'E-commerce', persona: 'Sophie' },
];

const FAQ = [
  {
    q: 'Est-ce que ça remplace vraiment mon standardiste ?',
    a: 'Pour 80 % des appels entrants standards (réservation, prise de RDV, renseignement horaires/menu), oui. Pour les cas complexes, le bot transfère ou enregistre un lead pour rappel humain.',
  },
  {
    q: 'Combien de temps pour configurer un bot ?',
    a: "Moins de 5 minutes. Vous choisissez le secteur, collez votre site web ou Google Business, le bot ingère le contexte automatiquement. Personnalisation avant déploiement.",
  },
  {
    q: 'Quelle est la qualité de la voix ?',
    a: 'Voix française naturelle (Cartesia sonic-3 ou ElevenLabs). Testable en direct sur la page de test, paramètres ajustables en temps réel.',
  },
  {
    q: 'Mes appels sont-ils sécurisés ?',
    a: 'Oui. HTTPS partout, webhooks signés HMAC, aucune donnée client stockée au-delà du transcript et du lead structuré.',
  },
  {
    q: 'Et si le bot hallucine ?',
    a: "Le bot est calibré pour ne JAMAIS inventer. Si une info manque, il dit honnêtement \"je note, un conseiller vous rappelle\". Vous gardez visibilité sur chaque transcript.",
  },
  {
    q: 'Puis-je résilier facilement ?',
    a: 'Oui, sans engagement. Résiliable à la fin de chaque mois sans frais. Le frais de setup unique reste dû.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen hero-bg">
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="size-8 rounded-full bg-default flex items-center justify-center">
              <Phone className="size-3.5 text-black" />
            </div>
            <span className="font-semibold tracking-tight uppercase">CallBot</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 uppercase text-xs tracking-widest">
            <Link href="/" className="hover:text-default transition-colors">
              Accueil
            </Link>
            <Link href="#secteurs" className="text-muted-foreground hover:text-default transition-colors">
              Secteurs
            </Link>
            <Link href="#about" className="text-muted-foreground hover:text-default transition-colors">
              À propos
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-default transition-colors">
              Tarifs
            </Link>
            <Link href="#faq" className="text-muted-foreground hover:text-default transition-colors">
              FAQ
            </Link>
          </nav>
          <Link href="/builder" className={buttonVariants({ size: 'sm' })}>
            Démarrer
          </Link>
        </div>
      </header>

      {/* HERO — 3-column Darkyn style */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-20 pb-20 lg:pt-32 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-6 items-center">
          <div className="text-center lg:text-left">
            <h1 className="display-massive text-default">Call</h1>
          </div>
          <div className="flex flex-col items-center text-center gap-6">
            <p className="text-base md:text-lg font-light max-w-md">
              Un standard téléphonique IA français qui prend les réservations, qualifie vos
              leads et cale les rendez-vous — 24 heures sur 24.
            </p>
            <Link
              href="/builder"
              className="group flex items-center gap-3 border-b border-default pb-1 uppercase text-sm tracking-widest hover:gap-5 transition-all"
            >
              <span>Démarrer</span>
              <ArrowUpRight className="size-4 text-default transition-transform group-hover:rotate-45" />
            </Link>
            <div className="display-light text-lg md:text-xl mt-2 leading-tight">
              Where Voice <br /> Meets AI.
            </div>
          </div>
          <div className="text-center lg:text-right">
            <h1 className="display-massive">Bot</h1>
          </div>
        </div>

        {/* Marquee sectors strip */}
        <div className="mt-20 lg:mt-28 overflow-hidden border-y border-border py-6">
          <div className="flex gap-16 scroll-x whitespace-nowrap">
            {[...Array(2)].flatMap((_, i) =>
              SECTORS.concat(SECTORS).map((s, j) => (
                <span
                  key={`${i}-${j}-${s.name}`}
                  className="display-light text-3xl md:text-5xl text-muted-foreground/60 flex items-center gap-6"
                >
                  <s.icon className="size-6 text-default" />
                  {s.name}
                </span>
              )),
            )}
          </div>
        </div>
      </section>

      {/* NUMBERS — 4 colored blocks with animated counters */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-10 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {NUMBERS.map((card) => {
            const { tone, label, count, suffix, static: staticVal, subtle } = card;
            const bg =
              tone === 'orange'
                ? 'bg-default text-black'
                : tone === 'dark'
                  ? 'bg-card border border-border'
                  : tone === 'grey'
                    ? 'bg-[#4a4a4a] text-white'
                    : 'bg-[#939393] text-black';
            const dot =
              tone === 'orange'
                ? 'bg-black'
                : tone === 'dark'
                  ? 'bg-default'
                  : tone === 'grey'
                    ? 'bg-default'
                    : 'bg-card';
            return (
              <div
                key={label}
                className={`${bg} rounded-md p-5 md:p-6 min-h-[180px] md:min-h-[260px] flex flex-col justify-between`}
              >
                <div className={`size-4 rounded-full ${dot}`} />
                <div className="mt-auto">
                  {!subtle && (
                    <div className="display-section text-4xl md:text-6xl mb-2 normal-case lowercase">
                      {count !== undefined ? (
                        <CountUp to={count} suffix={suffix ?? ''} />
                      ) : (
                        staticVal
                      )}
                    </div>
                  )}
                  <div className="text-[11px] uppercase tracking-widest opacity-80">{label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SERVICES — numbered stack on LIGHT section (Aigocy contrast pattern) */}
      <section className="section-light">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="md:col-span-1">
              <div className="uppercase text-xs tracking-widest text-default mb-3">— Services</div>
              <h2 className="display-section text-gradient-subtle">
                Ce que le bot <br /> sait faire
              </h2>
            </div>
            <p className="md:col-span-2 text-base md:text-lg font-light leading-relaxed self-end max-w-xl">
              Un produit complet, pas un prompt à brancher. De l&apos;ingestion contextuelle au
              booking calendrier, chaque brique est câblée et testée en production.
            </p>
          </div>
          <div className="space-y-1 border-t border-border">
            {SERVICES.map(({ n, title, icon: Icon }) => (
              <div
                key={n}
                className="group flex items-center justify-between gap-6 py-6 border-b border-border hover:bg-background/50 px-2 -mx-2 rounded transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-6 md:gap-10">
                  <div className="border border-border bg-card rounded px-3 py-1.5 text-xs font-mono text-foreground">
                    {n}
                  </div>
                  <div className="display-light text-2xl md:text-4xl">{title}</div>
                </div>
                <div className="hidden md:flex size-16 rounded-md bg-background border border-border items-center justify-center group-hover:bg-default group-hover:border-default transition-colors">
                  <Icon className="size-6 text-default group-hover:text-black transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT — Mission / Approche 2-col */}
      <section id="about" className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
        <h2 className="display-section mb-10">Qui sommes-nous</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <Plus className="size-14 md:size-16 text-default stroke-[1]" />
              <h3 className="display-light text-3xl md:text-4xl">
                Notre <br /> mission
              </h3>
            </div>
            <div className="border border-border rounded-lg p-3 flex items-center gap-3 min-h-[280px]">
              <div className="flex-1 px-4 md:px-6">
                <p className="text-base md:text-lg font-light leading-relaxed mb-8">
                  Rendre l&apos;IA vocale accessible à toutes les TPE et indépendants français.
                  Un standardiste qui ne dort jamais, pour le prix d&apos;un café par jour.
                </p>
                <div className="bg-default w-full h-2 rounded-full" />
              </div>
              <div className="hidden md:flex flex-1 h-full items-center justify-center bg-card rounded-md border border-border">
                <Phone className="size-16 text-default" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-end gap-6">
              <h3 className="display-light text-3xl md:text-4xl text-right">
                Notre <br /> approche
              </h3>
              <Plus className="size-14 md:size-16 text-default stroke-[1]" />
            </div>
            <div className="border border-border rounded-lg p-3 flex items-center gap-3 min-h-[280px]">
              <div className="hidden md:flex flex-1 h-full items-center justify-center bg-card rounded-md border border-border">
                <Bot className="size-16 text-default" />
              </div>
              <div className="flex-1 px-4 md:px-6 text-right">
                <div className="border border-default/40 w-full h-2 rounded-full mb-8" />
                <p className="text-base md:text-lg font-light leading-relaxed">
                  Voix française native, prompts calibrés par secteur, intégration agenda Google.
                  Du produit, pas du prompt à monter soi-même.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTORS */}
      <section id="secteurs" className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
        <div className="flex items-end justify-between border-b border-border pb-6 mb-10">
          <h2 className="display-section">Secteurs</h2>
          <Link
            href="/builder"
            className="uppercase text-xs tracking-widest text-muted-foreground hover:text-default transition-colors"
          >
            Tous les personas →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {SECTORS.map(({ icon: Icon, name, persona }) => (
            <Link
              key={name}
              href="/builder"
              className="group block border border-border bg-card rounded-md p-6 hover:border-default transition-colors"
            >
              <div className="aspect-square bg-background rounded-md flex items-center justify-center mb-4 group-hover:bg-default/10 transition-colors">
                <Icon className="size-10 text-default" />
              </div>
              <div className="display-light text-xl uppercase">{name}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
                {persona}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* LIVE CALL feature — real Vapi web demo */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="uppercase text-xs tracking-widest text-default mb-3">— Démo en direct</div>
            <h2 className="display-section mb-6">
              Parlez au bot <br /> maintenant
            </h2>
            <p className="text-base md:text-lg font-light leading-relaxed max-w-lg mb-6">
              Pas de formulaire, pas d&apos;inscription. Cliquez sur Démarrer à droite, autorisez
              le micro, parlez au bot comme si vous l&apos;appeliez. Vous entendez sa voix,
              voyez le transcript en direct.
            </p>
            <Link
              href="/builder"
              className="group flex items-center gap-3 border-b border-default pb-1 uppercase text-sm tracking-widest hover:gap-5 transition-all w-fit"
            >
              <span>Créer mon propre bot</span>
              <ArrowUpRight className="size-4 text-default transition-transform group-hover:rotate-45" />
            </Link>
          </div>
          <div className="md:max-w-md md:mx-auto w-full">
            <HomeDemoCall />
          </div>
        </div>
      </section>

      {/* PRICING TEASER — 3-card with Pro in inverted light style */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-1">
            <div className="uppercase text-xs tracking-widest text-default mb-3">— Tarifs</div>
            <h2 className="display-section">
              À partir de <br />
              <span className="text-default">99€</span> /mois
            </h2>
          </div>
          <p className="md:col-span-2 text-base md:text-lg font-light leading-relaxed self-end max-w-xl">
            Pas d&apos;engagement. Résiliable à la fin de chaque mois. Vs ~1 800€/mois pour un
            standardiste humain à temps partiel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
          {/* Starter — dark */}
          <div className="border border-border bg-card rounded-md p-7 hover:border-default/50 transition-colors">
            <div className="uppercase text-xs tracking-widest text-muted-foreground mb-2">
              Starter
            </div>
            <div className="display-section text-4xl mb-4">99€</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-6">
              200 min/mois · 0,50 €/min au-delà
            </div>
            <div className="text-sm font-light text-muted-foreground">
              Pour démarrer en douceur. Marco / Alex / Léa / Tom / Sophie. Email + SMS de
              confirmation inclus.
            </div>
          </div>

          {/* Pro — INVERTED light card */}
          <div className="bg-white text-black rounded-md p-7 relative ring-2 ring-default">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-default text-black px-3 py-1 rounded uppercase tracking-widest font-semibold whitespace-nowrap">
              Recommandé
            </span>
            <div className="uppercase text-xs tracking-widest text-neutral-500 mb-2">Pro</div>
            <div className="display-section text-4xl mb-4">199€</div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest mb-6">
              500 min/mois · 0,40 €/min au-delà
            </div>
            <div className="text-sm font-light text-neutral-700">
              Pour la majorité des établissements. Tarif au-delà réduit, support prioritaire,
              enrichissement contextuel automatique.
            </div>
          </div>

          {/* Business — dark */}
          <div className="border border-border bg-card rounded-md p-7 hover:border-default/50 transition-colors">
            <div className="uppercase text-xs tracking-widest text-muted-foreground mb-2">
              Business
            </div>
            <div className="display-section text-4xl mb-4">399€</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-6">
              1200 min/mois · 0,30 €/min au-delà
            </div>
            <div className="text-sm font-light text-muted-foreground">
              Pour les gros volumes. Multi-bots inclus, support dédié, onboarding personnalisé.
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/pricing" className={buttonVariants({ size: 'lg' }) + ' btn-elevated'}>
            Simuler mon tarif
            <ArrowUpRight className="size-4" />
          </Link>
          <Link href="/builder" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Démarrer
          </Link>
          <span className="text-xs text-muted-foreground ml-auto">
            + frais d&apos;installation unique de 149 €
          </span>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
        <h2 className="display-section border-b border-border pb-6 mb-10">Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <p className="text-sm font-light leading-relaxed max-w-xs">
              Les questions qu&apos;on nous pose le plus souvent. Si vous ne trouvez pas votre
              réponse, écrivez-nous directement.
            </p>
            <a
              href="mailto:sullivan.magdaleone@gmail.com"
              className="mt-6 inline-flex items-center gap-2 uppercase text-xs tracking-widest text-default hover:underline"
            >
              Nous contacter
              <ArrowUpRight className="size-3" />
            </a>
          </div>
          <div className="md:col-span-2 space-y-2">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group border border-border bg-card rounded-md px-5 py-4 hover:border-default/40 transition-colors [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium uppercase text-sm tracking-wide">
                  <span className="pr-4">{item.q}</span>
                  <ChevronDown className="size-4 text-default shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed font-light">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-32 text-center">
        <h2 className="display-massive">
          Ne <span className="text-default">dormez</span> <br /> plus jamais
        </h2>
        <p className="mt-8 text-lg md:text-xl font-light max-w-xl mx-auto">
          Cinq minutes pour configurer. Quelques heures pour rentabiliser. Sans engagement.
        </p>
        <Link
          href="/builder"
          className={buttonVariants({ size: 'lg' }) + ' mt-10'}
        >
          Créer mon CallBot
          <ArrowUpRight className="size-4" />
        </Link>
      </section>

      {/* FOOTER — Darkyn monumental */}
      <footer className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 border-t border-border">
        <div className="space-y-8">
          <a
            href="mailto:sullivan.magdaleone@gmail.com"
            className="display-section block hover:text-default transition-colors"
          >
            sullivan.magdaleone@gmail.com
          </a>
          <a
            href="tel:+33696694772"
            className="display-section block hover:text-default transition-colors text-muted-foreground"
          >
            +33 6 96 69 47 72
          </a>
          <div className="flex flex-wrap gap-x-8 gap-y-3 pt-8 border-t border-border">
            {[
              { label: 'X', href: '#' },
              { label: 'LinkedIn', href: '#' },
              { label: 'Instagram', href: '#' },
              { label: 'YouTube', href: '#' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 uppercase text-sm tracking-widest hover:text-default transition-colors"
              >
                {label}
                <ArrowDownRight className="size-3 group-hover:rotate-[-45deg] transition-transform" />
              </a>
            ))}
          </div>
          <div className="flex justify-between items-center pt-8 border-t border-border text-xs text-muted-foreground">
            <span>© CallBot 2026 — Standards téléphoniques IA</span>
            <a href="#" className="hover:text-default transition-colors uppercase tracking-widest">
              Retour en haut ↑
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
