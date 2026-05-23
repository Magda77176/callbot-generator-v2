import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  UtensilsCrossed,
  Home,
  Scissors,
  Stethoscope,
  ShoppingBag,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

const FEATURES = [
  {
    icon: Phone,
    title: 'Décroche 24/7',
    body: 'Plus jamais d\'appel manqué. Le bot prend tous vos appels entrants, même la nuit et le week-end.',
  },
  {
    icon: Sparkles,
    title: 'Enrichi par IA',
    body: 'Il connaît votre menu, votre portefeuille de biens, vos horaires — récupérés depuis votre site et Google Business automatiquement.',
  },
  {
    icon: Calendar,
    title: 'Cale les RDV',
    body: 'Synchronisé avec votre Google Calendar. Le bot vérifie vos dispos et bloque les créneaux en direct pendant l\'appel.',
  },
  {
    icon: Mail,
    title: 'Vous notifie',
    body: 'Email + SMS de confirmation à chaque résa ou lead capturé. Tout est tracé, structuré, exploitable.',
  },
];

const SECTORS = [
  { icon: UtensilsCrossed, name: 'Restaurant', persona: 'Marco', body: 'Réservations, livraisons, infos menu' },
  { icon: Home, name: 'Immobilier', persona: 'Alex', body: 'Qualification, biens, RDV de visite' },
  { icon: Scissors, name: 'Coiffeur', persona: 'Léa', body: 'Prise de RDV, prestations, tarifs' },
  { icon: Stethoscope, name: 'Dentaire', persona: 'Tom', body: 'Urgences, RDV, renseignements' },
  { icon: ShoppingBag, name: 'E-commerce', persona: 'Sophie', body: 'Suivi commande, SAV, retours' },
];

const STEPS = [
  { n: 1, title: 'Choisissez votre secteur', body: 'Restaurant, immobilier, coiffeur, dentaire ou e-commerce.' },
  { n: 2, title: 'Renseignez votre établissement', body: 'Nom, site, horaires. On récupère le reste automatiquement.' },
  { n: 3, title: 'Personnalisez la voix', body: 'Voix, modèle IA, ton. Vous gardez la main sur tout.' },
  { n: 4, title: 'Déployez en un clic', body: 'Bot prêt en moins de 2 minutes, prêt à recevoir des appels.' },
];

export default function HomePage() {
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
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
          >
            Tarifs
          </Link>
          <Link href="/builder" className={buttonVariants({ size: 'sm' })}>
            Démarrer
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto max-w-6xl px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground mb-8">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Disponible pour restaurants, agences immo et plus
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] text-balance">
          Votre standard téléphonique IA,
          <br />
          <span className="text-gradient">pour votre métier</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
          Marco prend les réservations. Alex qualifie vos leads immo et cale les RDV. Léa, Tom et
          Sophie sont là pour leurs secteurs. À partir de 99 €/mois.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/builder" className={buttonVariants({ size: 'lg' })}>
            Créer mon CallBot
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/pricing"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Voir les tarifs
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Sans engagement · Démarrage en 5 minutes · Voix française naturelle
        </p>
      </section>

      {/* Features */}
      <section className="container mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="glass rounded-2xl border border-border p-6 hover:border-primary/40 transition-colors"
            >
              <div className="size-10 rounded-lg bg-primary/15 ring-1 ring-primary/25 flex items-center justify-center mb-4">
                <Icon className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sectors */}
      <section className="container mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Un agent dédié par métier
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Chaque persona a son protocole, ses outils et son ton, calibrés pour le secteur.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {SECTORS.map(({ icon: Icon, name, persona, body }) => (
            <div
              key={name}
              className="glass rounded-xl border border-border p-5 text-center hover:border-primary/40 hover:-translate-y-0.5 transition-all"
            >
              <Icon className="size-6 text-primary mx-auto mb-3" />
              <div className="font-semibold text-sm">{name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{persona}</div>
              <div className="text-xs text-muted-foreground mt-3 leading-relaxed">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Prêt en 4 étapes
          </h2>
          <p className="mt-4 text-muted-foreground">
            De zéro à un bot fonctionnel, en moins de 5 minutes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-card/40 p-6">
              <div className="font-mono text-xs text-muted-foreground mb-3">0{s.n}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="container mx-auto max-w-4xl px-6 py-20">
        <div className="glass rounded-3xl border border-border p-10 md:p-14 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 opacity-50"
            style={{
              background:
                'radial-gradient(ellipse at center, oklch(0.72 0.18 230 / 0.25), transparent 70%)',
            }}
          />
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            À partir de <span className="text-gradient">99 €/mois</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
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

      {/* Footer */}
      <footer className="container mx-auto max-w-6xl px-6 py-12 border-t border-border mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
              <Phone className="size-3 text-primary" />
            </div>
            <span>CallBot · Standards téléphoniques IA</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/builder" className="hover:text-foreground transition-colors">
              Démarrer
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Tarifs
            </Link>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              sullivan.magdaleone@gmail.com
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
