import { durationSeconds, type VapiAssistant, type VapiCall } from './vapi-server';

export type PlanId = 'starter' | 'pro' | 'business';

export interface Plan {
  id: PlanId;
  name: string;
  monthlyEur: number;
  includedMinutes: number;
  overagePerMinuteEur: number;
}

// Pricing grid. Calibrated on operator cost ~0.05€/min (Vapi + LLM + STT/TTS,
// excluding fixed Telnyx phone fees). Markup decreases with volume — typical
// SaaS volume discount — while overage remains punitive enough to incentivize
// upgrading rather than absorbing the spillover.
//
//                  Plan price   Coût Vapi   Markup   Marge brute
//   Starter 199€   1000 min     ~50€        ~4x      75%
//   Pro     399€   2500 min     ~125€       ~3.2x    69%
//   Business 799€  6000 min     ~300€       ~2.66x   62%
//
// Overage is always >5x cost (0.20-0.30€/min vs 0.05€/min) → out-of-plan minutes
// are very profitable, which is the upgrade lever.
export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyEur: 199,
    includedMinutes: 1000,
    overagePerMinuteEur: 0.3,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyEur: 399,
    includedMinutes: 2500,
    overagePerMinuteEur: 0.25,
  },
  business: {
    id: 'business',
    name: 'Business',
    monthlyEur: 799,
    includedMinutes: 6000,
    overagePerMinuteEur: 0.2,
  },
};

export const DEFAULT_PLAN: PlanId = 'starter';

export function isPlanId(value: unknown): value is PlanId {
  return value === 'starter' || value === 'pro' || value === 'business';
}

// -------- Metadata accessors --------

export interface AssistantMeta {
  plan: PlanId;
  planStartDate?: string;
  businessName?: string;
  contactEmail?: string;
}

export function readMeta(assistant: VapiAssistant): AssistantMeta {
  const m = (assistant.metadata ?? {}) as Record<string, unknown>;
  const plan = isPlanId(m.plan) ? m.plan : DEFAULT_PLAN;
  return {
    plan,
    planStartDate: typeof m.planStartDate === 'string' ? m.planStartDate : undefined,
    businessName: typeof m.businessName === 'string' ? m.businessName : undefined,
    contactEmail: typeof m.contactEmail === 'string' ? m.contactEmail : undefined,
  };
}

// -------- Billing-period math --------

/**
 * Returns the start of the current billing month for an assistant. The cycle
 * anchors on the day-of-month from planStartDate (or assistant.createdAt as
 * a fallback), wrapping back at the start of the previous month if today is
 * before the anchor day this month.
 */
export function currentBillingPeriodStart(
  meta: AssistantMeta,
  assistant: VapiAssistant,
  now: Date = new Date(),
): Date {
  const anchorIso = meta.planStartDate ?? assistant.createdAt;
  const anchor = new Date(anchorIso);
  const anchorDay = anchor.getUTCDate();
  // Candidate: this month at anchorDay
  const candidate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), anchorDay, 0, 0, 0, 0),
  );
  if (candidate.getTime() <= now.getTime()) return candidate;
  // We're before the anchor this month → previous month's anchor
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, anchorDay, 0, 0, 0, 0),
  );
}

// -------- Per-assistant usage --------

export interface UsageSummary {
  plan: Plan;
  periodStart: Date;
  totalSeconds: number;
  totalMinutes: number;
  includedMinutes: number;
  overageMinutes: number;
  overageEur: number;
  billableEur: number; // monthly + overage
  pctUsed: number; // 0..1 (capped at 2 for >100% usage signal)
  callCount: number;
}

export function computeUsage(
  assistant: VapiAssistant,
  meta: AssistantMeta,
  calls: VapiCall[],
  now: Date = new Date(),
): UsageSummary {
  const plan = PLANS[meta.plan];
  const periodStart = currentBillingPeriodStart(meta, assistant, now);

  let totalSeconds = 0;
  let callCount = 0;
  for (const c of calls) {
    if (c.assistantId !== assistant.id) continue;
    if (!c.startedAt) continue;
    if (new Date(c.startedAt).getTime() < periodStart.getTime()) continue;
    totalSeconds += durationSeconds(c);
    callCount += 1;
  }

  const totalMinutes = Math.ceil(totalSeconds / 60); // bill by ceiling minute
  const overageMinutes = Math.max(0, totalMinutes - plan.includedMinutes);
  const overageEur = overageMinutes * plan.overagePerMinuteEur;
  const billableEur = plan.monthlyEur + overageEur;
  const pctUsed = Math.min(2, totalMinutes / plan.includedMinutes);

  return {
    plan,
    periodStart,
    totalSeconds,
    totalMinutes,
    includedMinutes: plan.includedMinutes,
    overageMinutes,
    overageEur,
    billableEur,
    pctUsed,
    callCount,
  };
}

export const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
