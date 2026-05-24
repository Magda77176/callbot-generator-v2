'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Plan, PlanId } from '@/lib/billing';
import { fmtEur } from '@/lib/billing';

interface PlanSelectorProps {
  assistantId: string;
  currentPlan: PlanId;
  plans: Record<PlanId, Plan>;
}

export function PlanSelector({ assistantId, currentPlan, plans }: PlanSelectorProps) {
  const [selected, setSelected] = useState<PlanId>(currentPlan);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = () => {
    if (selected === currentPlan) return;
    startTransition(async () => {
      const res = await fetch('/api/admin/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId, plan: selected }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!data.success) {
        toast.error(`Échec de la mise à jour : ${data.error ?? 'inconnu'}`);
        return;
      }
      toast.success(`Plan basculé sur ${plans[selected].name}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(plans) as PlanId[]).map((id) => {
          const p = plans[id];
          const isActive = id === selected;
          const isCurrent = id === currentPlan;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={
                'text-left rounded-md border p-5 transition-colors ' +
                (isActive
                  ? 'border-default bg-default/5 ring-2 ring-default'
                  : 'border-border bg-background hover:border-default/40')
              }
            >
              <div className="flex justify-between items-baseline mb-2">
                <div className="display-light text-xl uppercase">{p.name}</div>
                {isCurrent && (
                  <span className="text-[10px] uppercase tracking-widest text-default">
                    Actif
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                {fmtEur(p.monthlyEur)}/mois · {p.includedMinutes} min
              </div>
              <div className="text-xs text-muted-foreground font-light">
                Au-delà : {fmtEur(p.overagePerMinuteEur)}/min
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={selected === currentPlan || isPending}
          className={
            'btn-elevated inline-flex items-center justify-center rounded-md bg-default text-black px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'
          }
        >
          {isPending ? 'Mise à jour…' : 'Enregistrer le plan'}
        </button>
      </div>
    </div>
  );
}
