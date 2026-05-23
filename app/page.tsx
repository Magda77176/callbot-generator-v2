import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  Home,
  MessageSquare,
  Phone,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

const STATS = [
  { label: 'Secteurs supportés', value: '5' },
  { label: 'Disponibilité', value: '24/7' },
  { label: 'Setup', value: '< 5 min' },
  { label: 'À partir de', value: '99 €/mois' },
];

const FEATURES = [
  {
    icon: Phone,
    title: 'Décroche 24/7',
    body: 'Plus aucun appel manqué. Le bot prend tous vos appels entrants, jour, nuit, week-end.',
  },
  {
    icon: Sparkles,
    title: 'Enrichi par IA',
    body: 'Il connaît votre menu, votre portefeuille de biens, vos horaires — récupérés depuis votre site et Google Business automatiquement.',
  },
  {
    icon: Calendar,
    title: 'Cale les RDV',
    body: 'Synchronisé Google Calendar. Le bot vérifie vos dispos et bloque les créneaux en direct pendant l\'appel.',
  },
  {
    icon: MessageSquare,
    title: 'Vous notifie',
    body: 'Email + SMS de confirmation à chaque résa ou lead capturé. Tout est tracé, structuré, exploitable.',
  },
];

const SECTORS = [
  {
    icon: UtensilsCrossed,
    name: 'Restaurant',
    persona: 'Marco',
    body: 'Prend les réservations, gère les commandes à emporter et la livraison, renseigne sur le menu et les horaires.',
    actions: ['Réservation', 'Livraison', 'Carte', 'Horaires'],
  },
  {
    icon: Home,
    name: 'Immobilier',
    persona: 'Alex',
    body: 'Qualifie acheteurs et vendeurs, propose des biens du portefeuille, cale les visites sur l\'agenda du conseiller.',
    actions: ['Qualification', 'Proposition de biens', 'Booking visite', 'Estimation'],
  },
  {
    icon: Scissors,
    name: 'Coiffeur',
    persona: 'Léa',
    body: 'Prend les RDV par prestation, vérifie la dispo des stylistes, gère annulations et modifications.',
    actions: ['Prise de RDV', 'Annulation', 'Tarifs', 'Stylistes'],
  },
  {
    icon: Stethoscope,
    name: 'Dentaire',
    persona: 'Tom',
    body: 'Trie les urgences, prend les RDV de contrôle, renseigne sur les soins et le remboursement.',
    actions: ['Urgences', 'Consultations', 'Soins', 'Mutuelle'],
  },
  {
    icon: ShoppingBag,
    name: 'E-commerce',
    persona: 'Sophie',
    body: 'Gère le suivi de commande, les retours, les produits défectueux et les questions avant-vente.',
    actions: ['Suivi commande', 'Retours', 'SAV', 'Avant-vente'],
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Choisissez votre secteur',
    body: 'Sélectionnez un persona déjà calibré pour votre métier — Marco, Alex, Léa, Tom ou Sophie.',
  },
  {
    n: '02',
    title: 'Renseignez votre établissement',
    body: 'Nom, site, horaires. Le bot ingère votre Google Business et vos pages annonces automatiquement.',
  },
  {
    n: '03',
    title: 'Personnalisez la voix',
    body: 'Voix française naturelle, modèle IA, ton. Vous gardez la main sur le prompt système.',
  },
  {
    n: '04',
    title: 'Déployez en un clic',
    body: 'Bot prêt en moins de 2 minutes, prêt à recevoir des appels sur votre numéro Vapi.',
  },
];

const FAQ = [
  {
    q: 'Est-ce que ça remplace vraiment mon standardiste ?',
    a: 'Pour 80 % des appels entrants standards (réservation, prise de RDV, renseignement horaires/menu), oui. Pour les 20 % de cas plus complexes (plainte, négociation), le bot transfère vers vous ou enregistre un lead pour rappel humain. C\'est un assistant qui prend en charge la majorité, pas un remplacement intégral.',
  },
  {
    q: 'Combien de temps pour configurer un bot ?',
    a: 'Moins de 5 minutes. Vous choisissez le secteur, vous collez votre site web ou votre fiche Google, et le bot ingère votre contexte automatiquement. Vous pouvez ajuster le prompt et la voix avant déploiement.',
  },
  {
    q: 'Quelle est la qualité de la voix ?',
    a: 'Voix française naturelle (Cartesia sonic-3 ou ElevenLabs multilingual). Vous pouvez tester plusieurs voix en direct sur la page de test, et ajuster les paramètres en temps réel.',
  },
  {
    q: 'Mes appels sont-ils sécurisés ?',
    a: 'Oui. Toutes les communications passent par HTTPS, les webhooks sont signés HMAC, et nous ne stockons aucune donnée client au-delà de la durée du call à part le transcript et le lead structuré que vous voyez dans votre email.',
  },
  {
    q: 'Et si le bot se trompe ou hallucine ?',
    a: 'Le bot est calibré pour ne JAMAIS inventer de prix, de plat, ou de bien qui ne sont pas dans son contexte. Si une info manque, il dit honnêtement "je note, un conseiller vous rappelle". Vous gardez visibilité sur chaque transcript pour itérer le prompt.',
  },
  {
    q: 'Puis-je résilier facilement ?',
    a: 'Oui, sans engagement. Vous pouvez stopper votre abonnement à la fin de chaque mois sans frais. Le frais de setup unique reste dû.',
  },
];

function CallTranscriptMock() {
  return (
    <div className="glass rounded-2xl border border-border overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/40">
        <div className="flex items-center gap-2.5">
          <div className="size-2 rounded-full bg-emerald-400 pulse-dot" />
          <span className="text-xs font-medium">Appel en cours</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono">00:42</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Phone className="size-3" />
            +33 6 12 ··· 78
          </span>
        </div>
      </div>

      {/* Conversation */}
      <div className="p-5 space-y-3 text-sm">
        <div className="flex gap-2 items-end">
          <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Phone className="size-3 text-muted-foreground" />
          </div>
          <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[80%]">
            Bonjour, j&apos;aimerais réserver une table pour quatre personnes vendredi.
          </div>
        </div>

        <div className="flex gap-2 items-end justify-end">
          <div className="bg-primary/15 ring-1 ring-primary/30 rounded-2xl rounded-br-sm px-3.5 py-2 max-w-[80%]">
            Très bien, pour vendredi soir. À quelle heure souhaitez-vous venir ?
          </div>
          <div className="size-7 rounded-full bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center shrink-0">
            <Bot className="size-3.5 text-primary" />
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Phone className="size-3 text-muted-foreground" />
          </div>
          <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[80%]">
            Vingt heures.
          </div>
        </div>

        <div className="flex gap-2 items-end justify-end">
          <div className="bg-primary/15 ring-1 ring-primary/30 rounded-2xl rounded-br-sm px-3.5 py-2 inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-foreground/60 typing-dot" />
            <span className="size-1.5 rounded-full bg-foreground/60 typing-dot" />
            <span className="size-1.5 rounded-full bg-foreground/60 typing-dot" />
          </div>
          <div className="size-7 rounded-full bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center shrink-0">
            <Bot className="size-3.5 text-primary" />
          </div>
        </div>
      </div>

      {/* Footer / actions tracking */}
      <div className="px-5 py-3 border-t border-border bg-background/40 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-emerald-400">
          <Check className="size-3.5" />
          <span>Réservation structurée (date, heure, pax, nom, tel)</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <Check className="size-3.5" />
          <span>SMS de confirmation envoyé au client</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="size-3.5 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
          <span>Email au restaurateur en cours...</span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Sticky nav */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/50">
        <div className="container mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="size-8 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center group-hover:ring-glow transition-shadow">
              <Phone className="size-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">CallBot</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="#secteurs"
              className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
            >
              Secteurs
            </Link>
            <Link
              href="#fonctionnement"
              className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
            >
              Fonctionnement
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
            >
              Tarifs
            </Link>
            <Link href="/builder" className={buttonVariants({ size: 'sm' })}>
              Démarrer
              <ArrowRight className="size-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated background orbs */}
        <div
          aria-hidden
          className="absolute -top-32 left-1/2 -translate-x-1/2 size-[600px] rounded-full opacity-30 blur-[100px] orb-a"
          style={{ background: 'radial-gradient(circle, oklch(0.72 0.18 230 / 0.9), transparent 70%)' }}
        />
        <div
          aria-hidden
          className="absolute top-32 right-0 size-[400px] rounded-full opacity-25 blur-[100px] orb-b"
          style={{ background: 'radial-gradient(circle, oklch(0.62 0.22 290 / 0.9), transparent 70%)' }}
        />
        <div
          aria-hidden
          className="absolute top-64 -left-32 size-[500px] rounded-full opacity-20 blur-[100px] orb-c"
          style={{ background: 'radial-gradient(circle, oklch(0.65 0.2 350 / 0.8), transparent 70%)' }}
        />
        <div aria-hidden className="absolute inset-0 bg-grid pointer-events-none" />

        <div className="relative container mx-auto max-w-6xl px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-6">
                <span className="size-1.5 rounded-full bg-emerald-400 pulse-dot" />
                Standards téléphoniques IA français
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tighter leading-[1.02] text-balance">
                Le standard <span className="text-gradient">téléphonique IA</span> pour votre métier
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl text-balance">
                Marco prend les réservations. Alex qualifie vos leads immo et cale les RDV. 24/7,
                voix française naturelle, intégré à Google Calendar.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link href="/builder" className={buttonVariants({ size: 'lg' })}>
                  Créer mon CallBot
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                  Simuler mon tarif
                </Link>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Sans engagement · Démarrage en 5 min · 99 € / mois
              </p>
            </div>

            <div className="lg:col-span-5">
              <CallTranscriptMock />
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative border-y border-border bg-card/20">
        <div className="container mx-auto max-w-6xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <div className="text-3xl md:text-4xl font-semibold tracking-tight">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs text-primary uppercase tracking-wider font-medium mb-3">
            <Zap className="size-3.5" />
            Tout inclus
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Un produit complet, pas un bot à brancher vous-même. De l&apos;ingestion contextuelle au
            booking calendrier, tout est câblé.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group glass rounded-2xl border border-border p-6 hover:border-primary/40 transition-all hover:-translate-y-0.5"
            >
              <div className="size-10 rounded-lg bg-primary/15 ring-1 ring-primary/25 flex items-center justify-center mb-4 group-hover:ring-primary/50 transition-colors">
                <Icon className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 tracking-tight">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="fonctionnement" className="container mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs text-primary uppercase tracking-wider font-medium mb-3">
            <Sparkles className="size-3.5" />
            Fonctionnement
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter">Prêt en 4 étapes</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            De zéro à un bot fonctionnel en moins de 5 minutes. Pas de boulot d&apos;intégration.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-border bg-card/40 p-6 hover:border-primary/30 transition-colors"
            >
              <div className="font-mono text-xs text-primary mb-4 tracking-widest">{s.n}</div>
              <h3 className="font-semibold mb-2 tracking-tight">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sectors */}
      <section id="secteurs" className="container mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs text-primary uppercase tracking-wider font-medium mb-3">
            <Bot className="size-3.5" />
            Personas
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter">
            Un agent par métier
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Chaque persona a son protocole, ses outils et son ton — calibrés pour le secteur.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTORS.map(({ icon: Icon, name, persona, body, actions }) => (
            <div
              key={name}
              className="group glass rounded-2xl border border-border p-6 hover:border-primary/40 hover:-translate-y-1 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="size-11 rounded-xl bg-primary/15 ring-1 ring-primary/25 flex items-center justify-center group-hover:ring-primary/50 transition-colors">
                  <Icon className="size-5 text-primary" />
                </div>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {persona}
                </span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-2">{name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{body}</p>
              <div className="flex flex-wrap gap-1.5">
                {actions.map((a) => (
                  <span
                    key={a}
                    className="text-[10px] uppercase tracking-wider font-medium text-foreground/80 bg-muted/50 ring-1 ring-border px-2 py-0.5 rounded"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="container mx-auto max-w-5xl px-6 py-24">
        <div className="relative glass rounded-3xl border border-border p-10 md:p-16 text-center overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 60% 80% at center, oklch(0.72 0.18 230 / 0.25), transparent 70%)',
            }}
          />
          <div className="inline-flex items-center gap-2 text-xs text-primary uppercase tracking-wider font-medium mb-3">
            <Sparkles className="size-3.5" />
            Tarification transparente
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter">
            À partir de <span className="text-gradient">99 €/mois</span>
          </h2>
          <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
            Vs ~1 800 €/mois pour un standardiste humain temps partiel. Sans engagement,
            résiliable à la fin de chaque mois.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/pricing" className={buttonVariants({ size: 'lg' })}>
              Simuler mon tarif
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/builder" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Démarrer maintenant
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto max-w-3xl px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs text-primary uppercase tracking-wider font-medium mb-3">
            <MessageSquare className="size-3.5" />
            Questions fréquentes
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter">
            Tout ce qu&apos;on nous demande
          </h2>
        </div>
        <div className="space-y-2">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border bg-card/40 px-5 py-4 transition-colors hover:border-primary/30 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none font-medium">
                <span className="pr-4">{item.q}</span>
                <ChevronDown className="size-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tighter text-balance">
          Et si votre standard <br />
          <span className="text-gradient">ne dormait plus jamais ?</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
          Cinq minutes pour configurer. Quelques heures pour rentabiliser. Sans engagement.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/builder" className={buttonVariants({ size: 'lg' })}>
            Créer mon CallBot
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Voir les tarifs
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="container mx-auto max-w-6xl px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
                <Phone className="size-4 text-primary" />
              </div>
              <span className="font-semibold">CallBot</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm">
              Standards téléphoniques IA pour restaurants, agences immobilières, coiffeurs,
              cabinets dentaires et e-commerce.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Produit</div>
            <ul className="space-y-2">
              <li>
                <Link href="/builder" className="hover:text-primary transition-colors">
                  Démarrer
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="#secteurs" className="hover:text-primary transition-colors">
                  Secteurs
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Contact</div>
            <ul className="space-y-2 text-muted-foreground">
              <li>sullivan.magdaleone@gmail.com</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="container mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground flex justify-between">
            <span>© CallBot · Tous droits réservés</span>
            <span>Made with ❤︎ in France</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
