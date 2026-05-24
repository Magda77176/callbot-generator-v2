import Link from 'next/link';
import {
  durationSeconds,
  fmtCost,
  fmtDate,
  fmtDuration,
  listAssistants,
  listCalls,
} from '@/lib/vapi-server';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ assistantId?: string }>;
}

export default async function CallsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const assistantFilter = params.assistantId;

  let calls;
  let assistants;
  try {
    [calls, assistants] = await Promise.all([
      listCalls({ limit: 200, assistantId: assistantFilter }),
      listAssistants(200),
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

  const assistantById = new Map(assistants.map((a) => [a.id, a]));
  const filteredAssistant = assistantFilter ? assistantById.get(assistantFilter) : null;

  return (
    <div className="space-y-10">
      <div>
        <div className="uppercase text-xs tracking-widest text-default mb-3">— Appels</div>
        <h1 className="display-section">
          {filteredAssistant ? filteredAssistant.name || 'Assistant' : 'Tous les appels'}
        </h1>
        <p className="text-muted-foreground mt-3 font-light">
          {calls.length} appels{filteredAssistant ? ` sur ${filteredAssistant.name}` : ''}.
        </p>
        {assistantFilter && (
          <Link
            href="/admin/calls"
            className="text-xs uppercase tracking-widest text-default hover:underline inline-flex items-center gap-1 mt-2"
          >
            ← Retirer le filtre
          </Link>
        )}
      </div>

      {calls.length === 0 ? (
        <p className="text-muted-foreground font-light">Aucun appel pour cette sélection.</p>
      ) : (
        <div className="border border-border rounded-md bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background/60">
              <tr className="text-left uppercase text-[10px] tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Assistant</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Caller</th>
                <th className="px-4 py-3">Durée</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Coût</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {calls.map((c) => {
                const a = c.assistantId ? assistantById.get(c.assistantId) : null;
                const isOk = c.status === 'ended' && !c.endedReason?.includes('error');
                return (
                  <tr key={c.id} className="hover:bg-background/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      {fmtDate(c.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {a?.name || (
                        <span className="text-muted-foreground">
                          {c.assistantId?.slice(0, 12) ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      {c.type?.replace('PhoneCall', '') || c.type || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{c.customer?.number || '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtDuration(durationSeconds(c))}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'inline-flex text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ' +
                          (isOk
                            ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                            : 'bg-muted text-muted-foreground ring-1 ring-border')
                        }
                      >
                        {c.status ?? 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right">{fmtCost(c.cost)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/calls/${c.id}`}
                        className="text-xs uppercase tracking-widest text-default hover:underline"
                      >
                        Détail →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
