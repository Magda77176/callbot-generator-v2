import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PLANS, computeUsage, fmtEur, readMeta, type PlanId } from '@/lib/billing';
import {
  fmtDate,
  fmtDuration,
  getAssistant,
  listCalls,
  durationSeconds,
} from '@/lib/vapi-server';
import { PlanSelector } from './plan-selector';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssistantDetailPage({ params }: PageProps) {
  const { id } = await params;
  let assistant;
  let calls;
  try {
    [assistant, calls] = await Promise.all([getAssistant(id), listCalls({ limit: 200, assistantId: id })]);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return (
      <div className="border border-red-500/40 bg-red-500/10 rounded-md p-6">
        <div className="uppercase text-xs tracking-widest text-red-400 mb-2">Erreur API Vapi</div>
        <pre className="text-sm font-mono text-red-300 whitespace-pre-wrap">{message}</pre>
      </div>
    );
  }

  const meta = readMeta(assistant);
  const usage = computeUsage(assistant, meta, calls);
  const recent = [...calls]
    .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
    .slice(0, 10);

  return (
    <div className="space-y-10">
      <Link
        href="/admin/assistants"
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-default inline-flex items-center gap-1"
      >
        <ChevronLeft className="size-3" />
        Retour aux assistants
      </Link>

      <div>
        <div className="uppercase text-xs tracking-widest text-default mb-3">— Assistant</div>
        <h1 className="display-section">{assistant.name || '(sans nom)'}</h1>
        <p className="text-muted-foreground mt-2 font-mono text-xs">{assistant.id}</p>
      </div>

      {/* Plan management */}
      <div className="border border-border bg-card rounded-md p-6 space-y-5">
        <div>
          <div className="uppercase text-xs tracking-widest text-default mb-2">Plan facturable</div>
          <p className="text-sm font-light text-muted-foreground">
            Le plan détermine les minutes incluses et le tarif du dépassement. Modifiable à tout
            moment — pas d&apos;effet rétroactif sur les calls déjà comptabilisés ce mois.
          </p>
        </div>
        <PlanSelector assistantId={assistant.id} currentPlan={meta.plan} plans={PLANS} />
      </div>

      {/* Usage panel */}
      <div className="border border-border bg-card rounded-md p-6 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="uppercase text-xs tracking-widest text-default">Consommation ce mois</div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest">
            Période depuis {fmtDate(usage.periodStart.toISOString())}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Plan" value={usage.plan.name} />
          <Stat label="Minutes utilisées" value={`${usage.totalMinutes} / ${usage.includedMinutes}`} />
          <Stat
            label="Dépassement"
            value={
              usage.overageMinutes > 0 ? `+${usage.overageMinutes} min` : '—'
            }
          />
          <Stat label="Facturable" value={fmtEur(usage.billableEur)} />
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className={
              'h-full transition-all ' + (usage.overageMinutes > 0 ? 'bg-amber-400' : 'bg-default')
            }
            style={{ width: `${Math.min(100, (usage.totalMinutes / usage.includedMinutes) * 100)}%` }}
          />
        </div>
        {usage.overageMinutes > 0 && (
          <p className="text-xs text-amber-400 font-light">
            {usage.overageMinutes} minutes au-delà du forfait à {fmtEur(usage.plan.overagePerMinuteEur)}/min ={' '}
            {fmtEur(usage.overageEur)}.
          </p>
        )}
      </div>

      {/* Metadata */}
      <div className="border border-border bg-card rounded-md p-6">
        <div className="uppercase text-xs tracking-widest text-default mb-4">Identité</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Field label="Business" value={meta.businessName ?? '—'} />
          <Field label="Email contact" value={meta.contactEmail ?? '—'} />
          <Field label="Plan ancré le" value={meta.planStartDate ?? '—'} />
        </div>
      </div>

      {/* Recent calls */}
      <div>
        <div className="flex items-end justify-between border-b border-border pb-4 mb-6">
          <h2 className="display-section text-3xl">Derniers appels</h2>
          <Link
            href={`/admin/calls?assistantId=${assistant.id}`}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-default"
          >
            Tout voir →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-muted-foreground font-light">
            Aucun appel pour cet assistant.
          </p>
        ) : (
          <div className="border border-border rounded-md bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background/60">
                <tr className="text-left uppercase text-[10px] tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Caller</th>
                  <th className="px-4 py-3">Durée</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((c) => (
                  <tr key={c.id} className="hover:bg-background/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{fmtDate(c.startedAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.customer?.number ?? '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtDuration(durationSeconds(c))}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {c.status ?? 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/calls/${c.id}`}
                        className="text-xs uppercase tracking-widest text-default hover:underline"
                      >
                        →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background rounded p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="display-light text-xl">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </div>
      <div className="font-light">{value}</div>
    </div>
  );
}
