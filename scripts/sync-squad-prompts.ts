/**
 * One-shot script: push the latest squad system prompts (from lib/callbot-squads.ts)
 * onto the already-deployed Vapi assistants.
 *
 * Usage: VAPI_API_KEY=xxx npx tsx scripts/sync-squad-prompts.ts
 *
 * It finds squad members by looking for assistants with metadata.squadRole set,
 * then PATCHes model.systemPrompt from the current source of truth.
 */

import { SQUADS, type SquadRole } from '../lib/callbot-squads';

const API_KEY = process.env.VAPI_API_KEY?.trim();
if (!API_KEY) {
  console.error('VAPI_API_KEY not set');
  process.exit(1);
}

const BASE = 'https://api.vapi.ai';

interface VapiAssistant {
  id: string;
  name?: string;
  metadata?: Record<string, unknown>;
  model?: { systemPrompt?: string; [k: string]: unknown };
}

async function listAssistants(): Promise<VapiAssistant[]> {
  const res = await fetch(`${BASE}/assistant?limit=100`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`list assistants: ${res.status}`);
  return (await res.json()) as VapiAssistant[];
}

async function patchPrompt(id: string, systemPrompt: string): Promise<void> {
  const res = await fetch(`${BASE}/assistant/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: { systemPrompt } }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PATCH ${id}: ${res.status} — ${body}`);
  }
}

async function main() {
  const assistants = await listAssistants();

  // For each sector that has a squad config, find deployed members and sync
  for (const [sector, squad] of Object.entries(SQUADS)) {
    if (!squad) continue;
    console.log(`\n=== Squad: ${sector} ===`);

    const membersByRole = new Map(squad.members.map((m) => [m.role, m]));

    // Find Vapi assistants belonging to this squad
    const squadMembers = assistants.filter(
      (a) =>
        a.metadata?.squadRole &&
        a.metadata?.sector === sector,
    );

    if (squadMembers.length === 0) {
      console.log('  No deployed squad members found for this sector.');
      continue;
    }

    for (const assistant of squadMembers) {
      const role = assistant.metadata?.squadRole as SquadRole;
      const def = membersByRole.get(role);
      if (!def) {
        console.log(`  [SKIP] ${assistant.name} — role "${role}" not in squad config`);
        continue;
      }

      // Build the prompt the same way deploy does
      const businessName =
        typeof assistant.metadata?.businessName === 'string'
          ? assistant.metadata.businessName
          : 'votre agence';
      let systemPrompt = def.systemPrompt.replace(/\{\{business_name\}\}/g, businessName);

      // Proposer gets the enriched context (portfolio). We preserve what's
      // already there — just replace the part BEFORE the CONTEXTE block.
      if (role === 'proposer' && assistant.model?.systemPrompt) {
        const contextMarker = '══════════════\nCONTEXTE BUSINESS RÉEL\n══════════════';
        const existingIdx = assistant.model.systemPrompt.indexOf(contextMarker);
        if (existingIdx !== -1) {
          // Keep the existing context block, just replace the prompt before it
          const existingContext = assistant.model.systemPrompt.slice(existingIdx);
          systemPrompt += '\n\n' + existingContext;
        }
      }

      console.log(
        `  [PATCH] ${assistant.name} (${role}) — ${systemPrompt.length} chars`,
      );
      await patchPrompt(assistant.id, systemPrompt);
      console.log(`  [OK]   ${assistant.name}`);
    }
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
