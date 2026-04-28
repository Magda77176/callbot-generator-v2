import { config } from 'dotenv';
import { Agent, setGlobalDispatcher } from 'undici';

config({ path: '.env.local' });

setGlobalDispatcher(
  new Agent({
    connect: { family: 4, timeout: 10_000 },
    headersTimeout: 30_000,
    bodyTimeout: 30_000,
  }),
);

const ASSISTANT_ID = '4e8f5144-1fe0-49b0-bc05-9129e0dd4005';
const VAPI_KEY = process.env.VAPI_API_KEY;

// === Nouveau bloc COMMENT TU PARLES (avec règles dish + nom) ===
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

TU N'OUVRES JAMAIS UNE PHRASE PAR UN NOM DE PLAT
Les noms de plats (tartare, colombo, langouste, gambas, accras, etc.) ne peuvent apparaître qu'en RÉPONSE à une demande sur la carte ou pour citer un plat précis. JAMAIS comme accusé de réception ou ouverture. Si tu te surprends à commencer une phrase par "Tartare," ou "Colombo," tu remplaces par un mot du pool ci-dessus.

PRÉNOM ET NOM — PROTOCOLE DE CONFIRMATION
Quand le client te donne son nom :
1. Tu le repètes pour confirmation : "D'accord, au nom de Magda, c'est bien ça ?"
2. Si le client te donne deux versions différentes (ex. il dit "Rada" puis se corrige avec "Magda"), tu utilises UNIQUEMENT la version la plus récente. Tu ne fusionnes JAMAIS les deux ("Magdarada" est interdit).
3. Si le client épelle ou tu hésites sur l'orthographe, tu demandes : "Vous pouvez me l'épeler ? M comme Marie, A comme Anatole..."

TU FINIS TOUJOURS TES PHRASES
Tu ne laisses JAMAIS une phrase en suspens. Si tu commences "Alors je note quatre personnes pour vendredi à...", tu vas jusqu'au bout : "...vingt heures, c'est bien ça ?"
Si tu sens que tu as commencé une phrase trop longue, tu ne la coupes pas — tu la termines proprement avant de respirer ou de demander confirmation.

Tu fais des phrases courtes. Six à douze mots. Parfois trois. Mais jamais coupées au milieu.

Tu places des accusés-réception naturels et VARIÉS : "d'accord", "oui oui", "ok", "je vois", "parfait", "très bien", "pas de souci", "bien sûr", "entendu", "ça marche".

Tu utilises un français parlé, pas écrit. "On va faire" plutôt que "nous allons". "Y a" plutôt que "il y a". "Du coup" au lieu de "par conséquent".`;

// === Nouvelle règle prononciation (sans tirets, mot unique) ===
const NEW_PRONUNCIATION_BLOCK = `PRONONCIATION DES NOMS PROPRES — RÈGLE OBLIGATOIRE

Le restaurant s'écrit "Le Ti Taurus" mais à l'oral tu l'appelles TOUJOURS "Titorus" (un seul mot, prononcé "ti-to-russ" en français).
Quand tu nommes le restaurant à l'oral, écris "Titorus" dans ta réponse. JAMAIS "Le Ti Taurus", JAMAIS "Tee-Tow-Russ", JAMAIS "Tito Rhum", JAMAIS "Taurus" tout seul.
Exemples corrects :
- "Le Titorus, bonjour..."
- "...à bientôt au Titorus."
- "Vous appelez le Titorus, c'est bien ça."

`;

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
console.log(`  ✓ firstMessage: "${assistant.firstMessage}"`);
console.log(`  ✓ voice.chunkPlan:`, JSON.stringify(assistant.voice?.chunkPlan));

const changes = [];

// === STEP 2 : Replace COMMENT TU PARLES section ===
console.log('\n=== STEP 2 : Replace COMMENT TU PARLES ===');
const cttpStart = sp.indexOf('COMMENT TU PARLES');
const cttpEndAnchors = ['\nCHIFFRES ET NOMBRES', '\nCE QUE TU NE FAIS JAMAIS', '\nTON RÔLE'];
let cttpEnd = -1;
for (const a of cttpEndAnchors) {
  const i = sp.indexOf(a, cttpStart);
  if (i > 0 && (cttpEnd === -1 || i < cttpEnd)) cttpEnd = i;
}
if (cttpStart < 0 || cttpEnd < 0) {
  console.error('COMMENT TU PARLES section not found');
  process.exit(1);
}
sp = sp.slice(0, cttpStart) + NEW_COMMENT_TU_PARLES + '\n' + sp.slice(cttpEnd);
changes.push('COMMENT TU PARLES section replaced (with dish + name rules)');

// === STEP 3 : Replace PRONONCIATION block ===
console.log('\n=== STEP 3 : Replace PRONONCIATION block ===');
const proStart = sp.indexOf('PRONONCIATION DES NOMS PROPRES');
if (proStart >= 0) {
  const proEnd = sp.indexOf('\nCOMMENT TU PARLES', proStart);
  if (proEnd > 0) {
    sp = sp.slice(0, proStart) + NEW_PRONUNCIATION_BLOCK + sp.slice(proEnd + 1);
    changes.push('PRONONCIATION block replaced (Tee-Tow-Russ → Titorus)');
  }
}

// === STEP 4 : Global replace Tee-Tow-Russ → Titorus everywhere in systemPrompt ===
console.log('\n=== STEP 4 : Global swap of phonetic spellings ===');
const beforeLen = sp.length;
sp = sp.split('Tee-Tow-Russ').join('Titorus');
sp = sp.split('Tee-Tow-Russ').join('Titorus'); // safety
sp = sp.replace(/Tito Rhum/gi, 'Titorus');
sp = sp.replace(/Tito-Rhum/gi, 'Titorus');
if (sp.length !== beforeLen) {
  changes.push(`global Tee-Tow-Russ/Tito Rhum → Titorus (Δ ${sp.length - beforeLen})`);
}

// === STEP 5 : New firstMessage ===
const newFirstMessage = 'Lucie du Titorus, bonjour, comment puis-je vous aider ?';
if (newFirstMessage !== assistant.firstMessage) {
  changes.push(`firstMessage: "${assistant.firstMessage}" → "${newFirstMessage}"`);
}

// === STEP 6 : Update voice.chunkPlan to reduce hachure ===
console.log('\n=== STEP 6 : Tune chunkPlan + remove keyword pollution ===');
const newVoice = {
  ...assistant.voice,
  chunkPlan: {
    enabled: true,
    minCharacters: 60,
    punctuationBoundaries: ['.', '!', '?'],
  },
};
changes.push('voice.chunkPlan: minCharacters 30→60, boundaries restricted to . ! ?');

// === STEP 7 : Reduce keywords boost — remove dish names that pollute LLM context ===
const NEW_KEYWORDS = [
  'Titorus:3',
  'Mitan',
  'Martinique',
  'Magda',
  'Dupont',
];
const newTranscriber = {
  ...assistant.transcriber,
  keywords: NEW_KEYWORDS,
};
changes.push(`transcriber.keywords: 18 (with dish names) → 5 (proper nouns only, Titorus:3)`);

// === STEP 8 : PATCH ===
console.log('\n=== Changes ===');
for (const c of changes) console.log(`  • ${c}`);
console.log(`  total systemPrompt: ${assistant.model?.systemPrompt?.length} → ${sp.length} chars`);

const patchBody = {
  firstMessage: newFirstMessage,
  voice: newVoice,
  transcriber: newTranscriber,
  model: { ...assistant.model, systemPrompt: sp },
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
console.log(`\n  ✓ PATCH OK`);
console.log(`  ✓ systemPrompt: ${patched.model?.systemPrompt?.length} chars`);
console.log(`  ✓ firstMessage: "${patched.firstMessage}"`);
console.log(`  ✓ voice.chunkPlan:`, JSON.stringify(patched.voice?.chunkPlan));
console.log(`  ✓ transcriber.keywords:`, JSON.stringify(patched.transcriber?.keywords));
console.log(`  ✓ contains Titorus:`, patched.model?.systemPrompt?.includes('Titorus'));
console.log(`  ✓ no more Tee-Tow-Russ:`, !patched.model?.systemPrompt?.includes('Tee-Tow-Russ'));
console.log(`  ✓ contains PRÉNOM ET NOM rule:`, patched.model?.systemPrompt?.includes('PRÉNOM ET NOM — PROTOCOLE'));
console.log(`  ✓ contains anti-dish opener rule:`, patched.model?.systemPrompt?.includes("TU N'OUVRES JAMAIS UNE PHRASE PAR UN NOM DE PLAT"));
