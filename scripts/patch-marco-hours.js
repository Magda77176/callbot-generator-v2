import { config } from 'dotenv';

config({ path: '.env.local' });

const ASSISTANT_ID = '4e8f5144-1fe0-49b0-bc05-9129e0dd4005';
const VAPI_KEY = process.env.VAPI_API_KEY;

const OLD_HOURS_SENTENCE =
  'Les horaires précis ainsi que les éventuels jours de fermeture ne sont pas communiqués dans les sources disponibles.';

const NEW_HOURS_SENTENCE = `L'établissement est ouvert tous les jours, du lundi au dimanche, de neuf heures du matin à vingt-deux heures, sans jour de fermeture hebdomadaire. Toutefois, la cuisine ne sert qu'à partir de midi et jusqu'à vingt-deux heures : avant midi, seul le bar fonctionne pour les boissons. Toute commande de plats — sur place, à emporter ou en livraison — n'est donc possible qu'entre midi et vingt-deux heures.`;

console.log('=== STEP 1 : GET current assistant ===');
const aRes = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
  headers: { Authorization: `Bearer ${VAPI_KEY}` },
});
if (!aRes.ok) {
  console.error('GET failed:', aRes.status, await aRes.text());
  process.exit(1);
}
const assistant = await aRes.json();
const sp = assistant.model?.systemPrompt || '';
console.log(`  ✓ systemPrompt: ${sp.length} chars`);

console.log('\n=== STEP 2 : Splice opening hours into CONTEXTE BUSINESS RÉEL ===');

let newSP = sp;
const changes = [];

if (newSP.includes(OLD_HOURS_SENTENCE)) {
  newSP = newSP.replace(OLD_HOURS_SENTENCE, NEW_HOURS_SENTENCE);
  changes.push('"horaires non communiqués" → real hours (bar 9h-22h, cuisine 12h-22h)');
} else if (newSP.includes('de neuf heures du matin à vingt-deux heures')) {
  changes.push('hours already injected, skipping replace');
} else {
  console.error('Anchor sentence not found. Manual review required.');
  console.error('Looking for:', OLD_HOURS_SENTENCE);
  process.exit(1);
}

console.log(`  total: ${sp.length} → ${newSP.length} chars (Δ ${newSP.length - sp.length})`);
for (const c of changes) console.log(`  ${c}`);

console.log('\n=== STEP 3 : PATCH model.systemPrompt ===');
const newModel = { ...assistant.model, systemPrompt: newSP };
const pRes = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${VAPI_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: newModel }),
});
if (!pRes.ok) {
  console.error('PATCH failed:', pRes.status, await pRes.text());
  process.exit(1);
}
const patched = await pRes.json();
const finalSP = patched.model?.systemPrompt || '';
console.log(`  ✓ PATCH OK — systemPrompt now ${finalSP.length} chars`);
console.log(`  ✓ contains real bar hours (9h-22h):`, finalSP.includes('neuf heures du matin à vingt-deux heures'));
console.log(`  ✓ contains kitchen window (12h-22h):`, finalSP.includes('cuisine ne sert qu\'à partir de midi'));
console.log(`  ✓ no longer says "horaires non communiqués":`, !finalSP.includes('horaires précis ainsi que les éventuels jours de fermeture ne sont pas communiqués'));
