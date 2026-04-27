import { config } from 'dotenv';

config({ path: '.env.local' });

const ASSISTANT_ID = '4e8f5144-1fe0-49b0-bc05-9129e0dd4005';
const VAPI_KEY = process.env.VAPI_API_KEY;

const PHONE_BLOCK = `NUMÉROS DE TÉLÉPHONE — RÈGLE ABSOLUE DE CONFIRMATION

Le téléphone est la donnée la plus critique d'une réservation. Une erreur d'un seul chiffre = client injoignable.

Dès qu'un client te dicte un numéro, tu fais TROIS choses dans l'ordre :

1. Tu le repètes IMMÉDIATEMENT, par paires, lentement :
   "Alors, je note... zéro six... vingt-cinq... quarante-deux... soixante-trois... dix-huit. C'est bien ça ?"

2. Tu attends une confirmation explicite ("oui", "c'est ça", "tout à fait"). Si le client corrige, tu reformules entièrement le numéro corrigé et tu redemandes confirmation.

3. Si tu hésites entre deux chiffres similaires (trente-et-un / trente-neuf, soixante / soixante-dix, deux / douze), tu DEMANDES explicitement :
   "Excusez-moi, c'est trente-et-un ou trente-neuf ?"
   "Vous avez dit soixante ou soixante-dix ?"

Tu ne passes JAMAIS à l'étape suivante de la réservation tant que le numéro n'est pas confirmé deux fois (une fois par toi, une fois par le client).

Si le client te donne le numéro chiffre par chiffre ("zéro, six, deux, cinq..."), tu le re-regroupes par paires pour confirmation : "D'accord, donc zéro six, vingt-cinq..."`;

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
console.log(`  ✓ transcriber:`, JSON.stringify(assistant.transcriber));

console.log('\n=== STEP 2 : Inject phone confirmation block in systemPrompt ===');
const anchor = 'Tu reconfirmes à la fin de chaque réservation :';
const idx = sp.indexOf(anchor);
if (idx < 0) {
  console.error(`Anchor "${anchor}" not found in systemPrompt`);
  process.exit(1);
}
if (sp.includes('NUMÉROS DE TÉLÉPHONE — RÈGLE ABSOLUE DE CONFIRMATION')) {
  console.log('  ⚠ Block already present, skipping insertion');
}
const newSP = sp.includes('NUMÉROS DE TÉLÉPHONE — RÈGLE ABSOLUE DE CONFIRMATION')
  ? sp
  : sp.slice(0, idx) + PHONE_BLOCK + '\n\n' + sp.slice(idx);
console.log(`  ✓ new systemPrompt: ${newSP.length} chars (was ${sp.length}, +${newSP.length - sp.length})`);

console.log('\n=== STEP 3 : PATCH (transcriber + systemPrompt) ===');
const patchBody = {
  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'fr',
    numerals: true,
    smartFormat: true,
  },
  model: { ...assistant.model, systemPrompt: newSP },
};

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
console.log(`  ✓ transcriber:`, JSON.stringify(patched.transcriber));
console.log(`  ✓ systemPrompt: ${patched.model?.systemPrompt?.length} chars`);
console.log(
  `  ✓ contient bloc téléphone:`,
  patched.model?.systemPrompt?.includes('NUMÉROS DE TÉLÉPHONE — RÈGLE ABSOLUE DE CONFIRMATION'),
);
