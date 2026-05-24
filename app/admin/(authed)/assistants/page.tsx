import Link from 'next/link';
import {
  PLANS,
  computeUsage,
  fmtEur,
  readMeta,
  type UsageSummary,
} from '@/lib/billing';
import {
  fmtDate,
  listAssistants,
  listCalls,
  type VapiAssistant,
  type VapiCall,
} from '@/lib/vapi-server';

export const dynamic = 'force-dynamic';

interface Row {
  assistant: VapiAssistant;
  usage: UsageSummary;
  callCount: number;
  lastCallAt?: string;
}

function buildRows(assistants: VapiAssistant[], calls: VapiCall[]): Row[] {
  return assistants
    .map((a) => {
      const meta = readMeta(a);
      const usage = computeUsage(a, meta, calls);
      const own = calls.filter((c) => c.assistantId === a.id);
      const lastCallAt = own
        .map((c) => c.startedAt)
        .filter((x): x is string => Boolean(x))
        .sort()
        .pop();
      return { assistant: a, usage, callCount: own.length, lastCallAt };
    })
    .sort((a, b) => b.usage.totalMinutes - a.usage.totalMinutes);
}

export default async function AssistantsPage() {
  let assistants;
  let calls;
  try {
    [assistants, calls] = await Promise.all([listAssistants(200), listCalls({ limit: 500 })]);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return (
      <div className="border border-red-500/40 bg-red-500/10 rounded-md p-6">
        <div className="uppercase text-xs tracking-widest text-red-400 mb-2">Erreur API Vapi</div>
        <pre className="text-sm font-mono text-red-300 whitespace-pre-wrap">{message}</pre>
      </div>
    );
  }
  const rows = buildRows(assistants, calls);

  const totalMRR = rows.reduce((s, r) => s + r.usage.plan.monthlyEur, 0);
  const totalOverage = rows.reduce((s, r) => s + r.usage.overageEur, 0);
  const totalBillable = rows.reduce((s, r) => s + r.usage.billableEur, 0);

  return (
    <div className="space-y-10">
      <div>
        <div className="uppercase text-xs tracking-widest text-default mb-3">— Assistants</div>
        <h1 className="display-section">Tous les agents déployés</h1>
        <p className="text-muted-foreground mt-3 font-light">
          {assistants.length} assistants Vapi · agrégats sur les {calls.length} derniers appels.
        </p>
      </div>

      {/* Top-line billing summary */}
      <div className="grid grid-cols-3 gap-3 md:gap-5">
        <SummaryCard tone="orange" label="MRR forfaits" value={fmtEur(totalMRR)} />
        <SummaryCard tone="dark" label="Dépassement ce mois" value={fmtEur(totalOverage)} />
        <SummaryCard tone="grey" label="Total facturable" value={fmtEur(totalBillable)} />
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground font-light">Aucun assistant pour l&apos;instant.</p>
      ) : (
        <div className="border border-border rounded-md bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background/60">
              <tr className="text-left uppercase text-[10px] tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Conso ce mois</th>
                <th className="px-4 py-3">Dépassement</th>
                <th className="px-4 py-3 text-right">Facturable</th>
                <th className="px-4 py-3">Dernier appel</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ assistant, usage, lastCallAt }) => (
                <tr key={assistant.id} className="hover:bg-background/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{assistant.name || '(sans nom)'}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {assistant.id.slice(0, 16)}…
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex text-[10px] uppercase tracking-widest bg-muted ring-1 ring-border px-2 py-0.5 rounded">
                      {usage.plan.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    <UsageBar usage={usage} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {usage.overageMinutes > 0 ? (
                      <span className="text-amber-400">
                        +{usage.overageMinutes} min · {fmtEur(usage.overageEur)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right font-semibold">
                    {fmtEur(usage.billableEur)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {fmtDate(lastCallAt)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center gap-3 justify-end">
                      <Link
                        href={`/test/${assistant.id}`}
                        target="_blank"
                        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-default inline-flex items-center gap-1"
                        title="Tester ce bot dans un nouvel onglet"
                      >
                        🎤 Test
                      </Link>
                      <Link
                        href={`/admin/assistants/${assistant.id}`}
                        className="text-xs uppercase tracking-widest text-default hover:underline"
                      >
                        Détail →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plans key */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
        {Object.values(PLANS).map((p) => (
          <div key={p.id} className="border border-border rounded-md p-3">
            <div className="uppercase tracking-widest text-foreground mb-1">{p.name}</div>
            <div className="font-mono">
              {fmtEur(p.monthlyEur)} /mois · {p.includedMinutes} min inclus ·{' '}
              {fmtEur(p.overagePerMinuteEur)}/min au-delà
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsageBar({ usage }: { usage: UsageSummary }) {
  const widthPct = Math.min(100, (usage.totalMinutes / usage.includedMinutes) * 100);
  const isOverage = usage.overageMinutes > 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs tabular-nums">
        <span>
          {usage.totalMinutes} / {usage.includedMinutes} min
        </span>
        <span className="text-muted-foreground">{usage.callCount} appels</span>
      </div>
      <div className="h-1.5 bg-background rounded-full overflow-hidden">
        <div
          className={
            'h-full transition-all ' + (isOverage ? 'bg-amber-400' : 'bg-default')
          }
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  tone,
  label,
  value,
}: {
  tone: 'orange' | 'dark' | 'grey';
  label: string;
  value: string;
}) {
  const bg =
    tone === 'orange'
      ? 'bg-default text-black'
      : tone === 'dark'
        ? 'bg-card border border-border'
        : 'bg-[#4a4a4a] text-white';
  return (
    <div className={`${bg} rounded-md p-5`}>
      <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">{label}</div>
      <div className="display-section text-3xl normal-case">{value}</div>
    </div>
  );
}
