'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SyncPromptButtonProps {
  assistantId: string;
}

/**
 * Pushes the latest persona prompt for this assistant's sector onto the
 * live Vapi assistant. Useful because Vapi snapshots the system prompt at
 * create time — any iteration on lib/callbot-configs.ts only reaches
 * existing bots through an explicit PATCH.
 */
export function SyncPromptButton({ assistantId }: SyncPromptButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleConfirm = () => {
    startTransition(async () => {
      const res = await fetch('/api/admin/sync-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        promptLength?: number;
      };
      if (!data.success) {
        toast.error(`Échec : ${data.error ?? 'inconnu'}`);
        return;
      }
      toast.success(
        `Prompt resynchronisé (${data.promptLength?.toLocaleString('fr-FR')} caractères)`,
      );
      setConfirming(false);
      router.refresh();
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs uppercase tracking-widest bg-muted text-foreground ring-1 ring-border hover:bg-default/15 hover:text-default hover:ring-default/30 transition-colors"
      >
        <RefreshCw className="size-3.5" />
        Resync prompt
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-muted-foreground uppercase tracking-widest">
        Sync vers prompt actuel ?
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={handleConfirm}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs uppercase tracking-widest bg-default text-black hover:bg-default/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Sync…' : 'Confirmer'}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setConfirming(false)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        Annuler
      </button>
    </div>
  );
}
