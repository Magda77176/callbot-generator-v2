import Link from 'next/link';
import {
  durationSeconds,
  fmtCost,
  fmtDate,
  listAssistants,
  listCalls,
  type VapiAssistant,
  type VapiCall,
} from '@/lib/vapi-server';

export const dynamic = 'force-dynamic';

interface AssistantAggregate {
  assistant: VapiAssistant;
  callCount: number;
  totalSeconds: number;
  totalCost: number;
  lastCallAt?: string;
}

function aggregate(assistants: VapiAssistant[], calls: VapiCall[]): AssistantAggregate[] {
  const map = new Map<string, AssistantAggregate>();
  for (const a of assistants) {
    map.set(a.id, { assistant: a, callCount: 0, totalSeconds: 0, totalCost: 0 });
  }
  for (const c of calls) {
    if (!c.assistantId) continue;
    const agg = map.get(c.assistantId);
    if (!agg) continue;
    agg.callCount += 1;
    agg.totalSeconds += durationSeconds(c);
    agg.totalCost += c.cost ?? 0;
    if (!agg.lastCallAt || (c.startedAt && c.startedAt > agg.lastCallAt)) {
      agg.lastCallAt = c.startedAt;
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.callCount !== b.callCount) return b.callCount - a.callCount;
    return (
      new Date(b.assistant.createdAt).getTime() - new Date(a.assistant.createdAt).getTime()
    );
  });
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
  const rows = aggregate(assistants, calls);

  return (
    <div className="space-y-10">
      <div>
        <div className="uppercase text-xs tracking-widest text-default mb-3">— Assistants</div>
        <h1 className="display-section">Tous les agents déployés</h1>
        <p className="text-muted-foreground mt-3 font-light">
          {assistants.length} assistants Vapi · agrégats sur les {calls.length} derniers appels.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground font-light">Aucun assistant pour l&apos;instant.</p>
      ) : (
        <div className="border border-border rounded-md bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background/60">
              <tr className="text-left uppercase text-[10px] tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Créé le</th>
                <th className="px-4 py-3">Appels</th>
                <th className="px-4 py-3">Minutes</th>
                <th className="px-4 py-3">Coût total</th>
                <th className="px-4 py-3">Dernier appel</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ assistant, callCount, totalSeconds, totalCost, lastCallAt }) => (
                <tr key={assistant.id} className="hover:bg-background/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{assistant.name || '(sans nom)'}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {assistant.id.slice(0, 16)}…
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{fmtDate(assistant.createdAt)}</td>
                  <td className="px-4 py-3 tabular-nums">{callCount}</td>
                  <td className="px-4 py-3 tabular-nums">{Math.round(totalSeconds / 60)} min</td>
                  <td className="px-4 py-3 tabular-nums">{fmtCost(totalCost)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {fmtDate(lastCallAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/calls?assistantId=${assistant.id}`}
                      className="text-xs uppercase tracking-widest text-default hover:underline"
                    >
                      Voir appels →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
