'use client';

import { useState, useTransition } from 'react';
import { Calendar, Check, ExternalLink, Loader2 } from 'lucide-react';

interface Props {
  assistantId: string;
  provider: 'google_calendar';
  label: string;
  alreadyConnected: boolean;
}

export function ConnectProviderButton({
  assistantId,
  provider,
  label,
  alreadyConnected,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/composio/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assistantId, provider }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Échec de l\'initialisation');
        }
        if (!json.redirectUrl) {
          throw new Error('Pas de redirectUrl renvoyée par Composio');
        }
        // Open the OAuth flow in a new tab. Composio will redirect back to
        // /api/composio/callback once the user approves.
        window.open(json.redirectUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue');
      }
    });
  }

  if (alreadyConnected) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-md border border-emerald-500/30 bg-emerald-500/5">
        <Check className="size-4 text-emerald-400" />
        <div className="flex-1">
          <div className="text-sm font-medium text-emerald-200">{label} connecté</div>
          <div className="text-xs text-muted-foreground">
            Le bot peut consulter et créer des événements
          </div>
        </div>
        <button
          onClick={handleConnect}
          disabled={pending}
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-default"
        >
          Reconnecter
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleConnect}
        disabled={pending}
        className="w-full flex items-center justify-between px-4 py-3 rounded-md border border-border bg-card hover:border-default/50 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <Calendar className="size-4 text-default" />
          <div className="text-left">
            <div className="text-sm font-medium">Connecter {label}</div>
            <div className="text-xs text-muted-foreground">
              Ouvre une nouvelle fenêtre pour autoriser
            </div>
          </div>
        </div>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ExternalLink className="size-4 text-muted-foreground" />
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}
    </div>
  );
}
