import Link from 'next/link';
import { ArrowUpRight, PhoneCall, Users, Clock, CircleDollarSign } from 'lucide-react';
import {
  durationSeconds,
  fmtCost,
  fmtDate,
  fmtDuration,
  listAssistants,
  listCalls,
} from '@/lib/vapi-server';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminDashboardPage() {
  let assistants;
  let calls;
  try {
    [assistants, calls] = await Promise.all([
      listAssistants(100),
      listCalls({ limit: 100 }),
    ]);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return (
      <div className="border border-red-500/40 bg-red-500/10 rounded-md p-6">
        <div className="uppercase text-xs tracking-widest text-red-400 mb-2">Erreur API Vapi</div>
        <pre className="text-sm font-mono text-red-300 whitespace-pre-wrap">{message}</pre>
      </div>
    );
  }

  const now = Date.now();
  const callsLast7d = calls.filter(
    (c) => c.startedAt && now - new Date(c.startedAt).getTime() < 7 * DAY_MS,
  );
  const callsLast24h = calls.filter(
    (c) => c.startedAt && now - new Date(c.startedAt).getTime() < DAY_MS,
  );
  const costLast30d = calls
    .filter((c) => c.startedAt && now - new Date(c.startedAt).getTime() < 30 * DAY_MS)
    .reduce((sum, c) => sum + (c.cost ?? 0), 0);
  const totalSeconds = calls.reduce((sum, c) => sum + durationSeconds(c), 0);
  const avgSeconds = calls.length ? Math.round(totalSeconds / calls.length) : 0;

  const recent = calls.slice(0, 8);

  return (
    <div className="space-y-12">
      <div>
        <div className="uppercase text-xs tracking-widest text-default mb-3">— Tableau de bord</div>
        <h1 className="display-section">Vue d&apos;ensemble</h1>
        <p className="text-muted-foreground mt-3 font-light">
          Tous les agents déployés via Vapi · live data, fetch direct API.
        </p>
      </div>

      {/* KPI grid — Aigocy numbers pattern with colored block emphasis */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        <KpiCard
          tone="orange"
          icon={Users}
          label="Assistants"
          big={String(assistants.length)}
        />
        <KpiCard
          tone="dark"
          icon={PhoneCall}
          label="Appels 7 jours"
          big={String(callsLast7d.length)}
          sub={`${callsLast24h.length} dernières 24h`}
        />
        <KpiCard
          tone="grey"
          icon={Clock}
          label="Durée moyenne"
          big={fmtDuration(avgSeconds)}
        />
        <KpiCard
          tone="light"
          icon={CircleDollarSign}
          label="Coût 30 jours"
          big={fmtCost(costLast30d)}
        />
      </div>

      {/* Recent calls */}
      <div>
        <div className="flex items-end justify-between border-b border-border pb-4 mb-6">
          <h2 className="display-section text-3xl">Appels récents</h2>
          <Link
            href="/admin/calls"
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-default inline-flex items-center gap-1"
          >
            Tout voir
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-muted-foreground font-light">Aucun appel pour l&apos;instant.</p>
        ) : (
          <div className="border border-border rounded-md bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background/60">
                <tr className="text-left uppercase text-[10px] tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Caller</th>
                  <th className="px-4 py-3">Durée</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Coût</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((c) => (
                  <tr key={c.id} className="hover:bg-background/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{fmtDate(c.startedAt)}</td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      {c.type?.replace('PhoneCall', '') || c.type}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{c.customer?.number || '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtDuration(durationSeconds(c))}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={c.status} endedReason={c.endedReason} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right">{fmtCost(c.cost)}</td>
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

function KpiCard({
  tone,
  icon: Icon,
  label,
  big,
  sub,
}: {
  tone: 'orange' | 'dark' | 'grey' | 'light';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  big: string;
  sub?: string;
}) {
  const bg =
    tone === 'orange'
      ? 'bg-default text-black'
      : tone === 'dark'
        ? 'bg-card border border-border'
        : tone === 'grey'
          ? 'bg-[#4a4a4a] text-white'
          : 'bg-[#939393] text-black';
  return (
    <div className={`${bg} rounded-md p-5 md:p-6 min-h-[180px] flex flex-col justify-between`}>
      <Icon className="size-5 opacity-80" />
      <div>
        <div className="display-section text-3xl md:text-5xl mb-1 normal-case lowercase">{big}</div>
        <div className="text-[10px] uppercase tracking-widest opacity-80">{label}</div>
        {sub && <div className="text-[10px] opacity-70 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function StatusPill({ status, endedReason }: { status?: string; endedReason?: string }) {
  const ok = status === 'ended' && !endedReason?.includes('error');
  return (
    <span
      className={
        'inline-flex text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ' +
        (ok
          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
          : 'bg-muted text-muted-foreground ring-1 ring-border')
      }
    >
      {status ?? 'unknown'}
    </span>
  );
}
