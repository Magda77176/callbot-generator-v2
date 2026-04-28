import { config } from 'dotenv';

config({ path: '.env.local' });

const ASSISTANT_ID = '4e8f5144-1fe0-49b0-bc05-9129e0dd4005';
const VAPI_KEY = process.env.VAPI_API_KEY;

const NEW_COMMENT_TU_PARLES = `COMMENT TU PARLES

Tu hésites. Souvent. Écris les hésitations dans tes réponses, ne les garde pas mentalement. Varie tes hésitations, n'utilise JAMAIS deux fois de suite la même :
- "Euh... alors voyons..."
- "Hmm, attendez..."
- "Bon, alors..."
- "Voyons voir..."
- "Tiens..."
- "Oui, donc..."
- "Alors..."
- "Mmh..."
- "D'accord, alors..."
- "Très bien, donc..."

VARIÉTÉ DES OUVERTURES — RÈGLE OBLIGATOIRE
Tu ne commences JAMAIS deux phrases consécutives par le même mot. Surtout pas par "Ah".
Exemples mal :
- "Ah d'accord. Ah parfait. Ah je note."
Exemples bien :
- "D'accord, je note. Très bien. Donc on a..."

Tu varies systématiquement entre : "D'accord", "Très bien", "Parfait", "Bon", "OK", "Bien", "Oui", "Donc", "Alors", "Voilà", "Hmm", "Tiens".
Le mot "Ah" est autorisé MAX UNE FOIS toutes les 5 phrases. Au-delà ça sonne robotique.

TU FINIS TOUJOURS TES PHRASES
Tu ne laisses JAMAIS une phrase en suspens. Si tu commences "Alors je note quatre personnes pour vendredi à...", tu vas jusqu'au bout : "...vingt heures, c'est bien ça ?"
Si tu sens que tu as commencé une phrase trop longue, tu ne la coupes pas — tu la termines proprement avant de respirer ou de demander confirmation.

Tu fais des phrases courtes. Six à douze mots. Parfois trois. Mais jamais coupées au milieu.

Tu places des accusés-réception naturels et VARIÉS : "d'accord", "oui oui", "ok", "je vois", "parfait", "très bien", "pas de souci", "bien sûr", "entendu", "ça marche".

Tu utilises un français parlé, pas écrit. "On va faire" plutôt que "nous allons". "Y a" plutôt que "il y a". "Du coup" au lieu de "par conséquent".`;

// Vapi/Deepgram exige UN SEUL MOT par keyword (pas d'espace, pas de tiret, pas d'apostrophe)
const RESTAURANT_KEYTERMS = [
  'Taurus',
  'Mitan',
  'Martinique',
  'colombo',
  'langouste',
  'accras',
  'lambis',
  'gambas',
  'rascasse',
  'jacques',
  'rhum',
  'créole',
  'tartare',
  'magret',
  'entrecôte',
  'gigot',
  'tapas',
  'cocktails',
];

console.log('=== STEP 1 : GET current assistant ===');
const aRes = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
  headers: { Authorization: `Bearer ${VAPI_KEY}` },
});
if (!aRes.ok) {
  console.error('GET failed:', aRes.status, await aRes.text());
  process.exit(1);
}
const assistant = await aRes.json();
let sp = assistant.model?.systemPrompt || '';
console.log(`  ✓ systemPrompt: ${sp.length} chars`);
console.log(`  ✓ transcriber:`, JSON.stringify(assistant.transcriber));
console.log(`  ✓ numWordsToInterruptAssistant:`, assistant.numWordsToInterruptAssistant);
console.log(`  ✓ stopSpeakingPlan:`, JSON.stringify(assistant.stopSpeakingPlan));

const changes = [];

// === STEP 2 : Replace COMMENT TU PARLES section ===
console.log('\n=== STEP 2 : Replace COMMENT TU PARLES section ===');
const startAnchor = 'COMMENT TU PARLES';
const startIdx = sp.indexOf(startAnchor);
if (startIdx < 0) {
  console.error('Anchor "COMMENT TU PARLES" not found');
  process.exit(1);
}
// End at next major heading
const endAnchors = [
  '\nCHIFFRES ET NOMBRES',
  '\nCE QUE TU NE FAIS JAMAIS',
  '\nTON RÔLE',
];
let endIdx = -1;
for (const a of endAnchors) {
  const i = sp.indexOf(a, startIdx);
  if (i > 0 && (endIdx === -1 || i < endIdx)) endIdx = i;
}
if (endIdx < 0) {
  console.error('Could not find end of COMMENT TU PARLES');
  process.exit(1);
}
const oldLen = endIdx - startIdx;
sp = sp.slice(0, startIdx) + NEW_COMMENT_TU_PARLES + '\n' + sp.slice(endIdx);
changes.push(`COMMENT TU PARLES section: ${oldLen} → ${NEW_COMMENT_TU_PARLES.length} chars`);

// === STEP 3 : Build PATCH body — transcriber + interrupt thresholds + systemPrompt ===
console.log('\n=== STEP 3 : Build PATCH body ===');

const newTranscriber = {
  provider: 'deepgram',
  model: 'nova-2',
  language: 'fr',
  numerals: true,
  smartFormat: true,
  endpointing: 300,
  keywords: RESTAURANT_KEYTERMS.map((k) => `${k}:2`),
};

const newStopSpeakingPlan = {
  ...(assistant.stopSpeakingPlan || {}),
  numWords: 5,
  voiceSeconds: 0.5,
  backoffSeconds: 1.5,
};

const patchBody = {
  transcriber: newTranscriber,
  numWordsToInterruptAssistant: 5,
  stopSpeakingPlan: newStopSpeakingPlan,
  model: { ...assistant.model, systemPrompt: sp },
};

changes.push(`transcriber: + endpointing:300 + ${RESTAURANT_KEYTERMS.length} keywords`);
changes.push(`numWordsToInterruptAssistant: ${assistant.numWordsToInterruptAssistant} → 5`);
changes.push(`stopSpeakingPlan: numWords ${assistant.stopSpeakingPlan?.numWords} → 5, voiceSeconds ${assistant.stopSpeakingPlan?.voiceSeconds} → 0.5, backoffSeconds → 1.5`);

console.log('\n  Changes:');
for (const c of changes) console.log(`    • ${c}`);

console.log('\n=== STEP 4 : PATCH ===');
const pRes = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${VAPI_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(patchBody),
});
if (!pRes.ok) {
  console.error('PATCH failed:', pRes.status, await pRes.text());
  process.exit(1);
}
const patched = await pRes.json();
console.log(`  ✓ PATCH OK`);
console.log(`  ✓ systemPrompt: ${patched.model?.systemPrompt?.length} chars`);
console.log(`  ✓ transcriber:`, JSON.stringify(patched.transcriber));
console.log(`  ✓ numWordsToInterruptAssistant:`, patched.numWordsToInterruptAssistant);
console.log(`  ✓ stopSpeakingPlan:`, JSON.stringify(patched.stopSpeakingPlan));
console.log(
  `  ✓ contains VARIÉTÉ rule:`,
  patched.model?.systemPrompt?.includes('VARIÉTÉ DES OUVERTURES'),
);
console.log(
  `  ✓ contains TU FINIS rule:`,
  patched.model?.systemPrompt?.includes('TU FINIS TOUJOURS TES PHRASES'),
);
