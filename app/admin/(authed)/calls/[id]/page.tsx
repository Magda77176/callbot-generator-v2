import Link from 'next/link';
import { AlertTriangle, ChevronLeft, Wrench } from 'lucide-react';
import {
  durationSeconds,
  extractToolEvents,
  fmtCost,
  fmtDate,
  fmtDuration,
  getAssistant,
  getCall,
} from '@/lib/vapi-server';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CallDetailPage({ params }: PageProps) {
  const { id } = await params;
  let call;
  try {
    call = await getCall(id);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return (
      <div className="border border-red-500/40 bg-red-500/10 rounded-md p-6">
        <div className="uppercase text-xs tracking-widest text-red-400 mb-2">Erreur API Vapi</div>
        <pre className="text-sm font-mono text-red-300 whitespace-pre-wrap">{message}</pre>
      </div>
    );
  }

  const assistant = call.assistantId
    ? await getAssistant(call.assistantId).catch(() => null)
    : null;

  return (
    <div className="space-y-10">
      <Link
        href="/admin/calls"
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-default inline-flex items-center gap-1"
      >
        <ChevronLeft className="size-3" />
        Retour aux appels
      </Link>

      <div>
        <div className="uppercase text-xs tracking-widest text-default mb-3">— Appel</div>
        <h1 className="display-section">
          {assistant?.name || 'Appel'} ·{' '}
          <span className="text-muted-foreground">{fmtDate(call.startedAt)}</span>
        </h1>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Durée" value={fmtDuration(durationSeconds(call))} />
        <Stat label="Statut" value={call.status ?? '—'} />
        <Stat label="Caller" value={call.customer?.number ?? '—'} mono />
        <Stat label="Coût total" value={fmtCost(call.cost)} />
      </div>

      {/* Cost breakdown */}
      {call.costBreakdown && (
        <div className="border border-border bg-card rounded-md p-6">
          <div className="uppercase text-xs tracking-widest text-default mb-4">
            Breakdown du coût
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Stat label="LLM" value={fmtCost(call.costBreakdown.llm)} />
            <Stat label="STT" value={fmtCost(call.costBreakdown.stt)} />
            <Stat label="TTS" value={fmtCost(call.costBreakdown.tts)} />
            <Stat label="Transport" value={fmtCost(call.costBreakdown.transport)} />
            <Stat label="Vapi" value={fmtCost(call.costBreakdown.vapi)} />
          </div>
        </div>
      )}

      {/* Tool calls — most useful diagnostic for booking failures */}
      <ToolEventsPanel events={extractToolEvents(call)} />

      {/* Recording */}
      {call.recordingUrl && (
        <div className="border border-border bg-card rounded-md p-6 space-y-3">
          <div className="uppercase text-xs tracking-widest text-default">Enregistrement</div>
          <audio src={call.recordingUrl} controls className="w-full" />
          <a
            href={call.recordingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs uppercase tracking-widest text-default hover:underline"
          >
            Ouvrir dans un nouvel onglet →
          </a>
        </div>
      )}

      {/* Summary */}
      {call.summary && (
        <div className="border border-border bg-card rounded-md p-6">
          <div className="uppercase text-xs tracking-widest text-default mb-3">Résumé Vapi</div>
          <p className="text-sm font-light leading-relaxed">{call.summary}</p>
        </div>
      )}

      {/* Transcript */}
      {call.transcript && (
        <div className="border border-border bg-card rounded-md p-6">
          <div className="uppercase text-xs tracking-widest text-default mb-3">Transcript</div>
          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-muted-foreground max-h-[60vh] overflow-y-auto">
            {call.transcript}
          </pre>
        </div>
      )}

      {/* End reason if not OK */}
      {call.endedReason && (
        <div className="border border-border bg-card rounded-md p-6">
          <div className="uppercase text-xs tracking-widest text-default mb-2">Fin d&apos;appel</div>
          <div className="font-mono text-sm">{call.endedReason}</div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border border-border bg-card rounded-md p-4">
      <div className="uppercase text-[10px] tracking-widest text-muted-foreground mb-1">
        {label}
      </div>
      <div className={mono ? 'font-mono text-sm' : 'display-light text-xl'}>{value}</div>
    </div>
  );
}

function ToolEventsPanel({
  events,
}: {
  events: ReturnType<typeof extractToolEvents>;
}) {
  if (events.length === 0) {
    return (
      <div className="border border-amber-500/30 bg-amber-500/5 rounded-md p-6">
        <div className="flex items-center gap-2 uppercase text-xs tracking-widest text-amber-400 mb-2">
          <AlertTriangle className="size-4" />
          Aucun tool call détecté
        </div>
        <p className="text-sm font-light text-muted-foreground leading-relaxed">
          Le bot n&apos;a invoqué aucune fonction pendant cet appel. Pour un appel qui devait
          aboutir à un booking ou un lead enregistré, c&apos;est probablement la cause du
          problème : le bot a dit &ldquo;c&apos;est calé&rdquo; à l&apos;oral mais n&apos;a pas
          déclenché la fonction sous-jacente.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card rounded-md p-6">
      <div className="uppercase text-xs tracking-widest text-default mb-4 flex items-center gap-2">
        <Wrench className="size-4" />
        Tool calls ({events.length})
      </div>
      <div className="space-y-3">
        {events.map((e, i) => {
          const isCall = e.kind === 'call';
          const hasError =
            !!e.error || (typeof e.result === 'string' && /erreur|error|missing|failed/i.test(e.result));
          return (
            <div
              key={i}
              className={
                'rounded-md border p-4 ' +
                (hasError
                  ? 'border-red-500/30 bg-red-500/5'
                  : isCall
                    ? 'border-default/30 bg-default/5'
                    : 'border-emerald-500/30 bg-emerald-500/5')
              }
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-widest font-semibold">
                    {isCall ? '→ Call' : '← Result'}
                  </span>
                  <span className="font-mono text-xs">{e.toolName}</span>
                </div>
                {e.secondsFromStart !== undefined && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    @ {Math.round(e.secondsFromStart)}s
                  </span>
                )}
              </div>
              {isCall && e.arguments && (
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap bg-background/50 rounded p-3 max-h-48 overflow-auto">
                  {typeof e.arguments === 'string'
                    ? e.arguments
                    : JSON.stringify(e.arguments, null, 2)}
                </pre>
              )}
              {!isCall && (e.result || e.error) && (
                <pre
                  className={
                    'text-xs font-mono whitespace-pre-wrap bg-background/50 rounded p-3 max-h-48 overflow-auto ' +
                    (hasError ? 'text-red-300' : 'text-emerald-300')
                  }
                >
                  {e.error ? `ERROR: ${e.error}` : e.result}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
