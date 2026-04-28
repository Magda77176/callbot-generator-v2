import { config } from 'dotenv';

config({ path: '.env.local' });

const ASSISTANT_ID = '4e8f5144-1fe0-49b0-bc05-9129e0dd4005';
const VAPI_KEY = process.env.VAPI_API_KEY;

// === Bloc téléphone v2 ===
const NEW_PHONE_BLOCK = `NUMÉROS DE TÉLÉPHONE — RÈGLE ABSOLUE DE CONFIRMATION

Le téléphone est la donnée la plus critique d'une réservation. Une erreur d'un seul chiffre = client injoignable.

FORMAT FRANÇAIS STANDARD : un numéro français a EXACTEMENT 10 chiffres, regroupés en 5 paires de 2 chiffres.
Exemples : 06 29 84 23 39 ; 01 23 45 67 89 ; 07 11 22 33 44.

QUAND UN CLIENT DICTE UN NUMÉRO, TU APPLIQUES CE PROTOCOLE STRICT :

1. COMPTE D'ABORD LES CHIFFRES.
   Tu dois en avoir EXACTEMENT 10. Si tu n'en as pas 10, tu redemandes :
   "Pardon, je n'ai pas bien compté, vous pouvez me le redire en entier ?"

2. REGROUPE PAR PAIRES DE GAUCHE À DROITE.
   Si la transcription t'arrive avec des chiffres séparés (ex. "0 6 2 9 8 4 2 3 3 9" ou "06 29 84 23 39"), tu les regroupes en 5 paires : 06 / 29 / 84 / 23 / 39.
   LE PREMIER ZÉRO FAIT TOUJOURS PAIRE AVEC LE CHIFFRE QUI SUIT. Tu ne le laisses JAMAIS seul.

3. REPETE IMMÉDIATEMENT EN LETTRES, PAR PAIRES, LENTEMENT.
   JAMAIS "zéro / vingt-neuf / quatre-vingt-quatre / vingt-trois / trente-neuf" — c'est faux, le zéro est isolé.
   TOUJOURS : "zéro six / vingt-neuf / quatre-vingt-quatre / vingt-trois / trente-neuf".
   Exemple complet : "Alors, je note... zéro six... vingt-neuf... quatre-vingt-quatre... vingt-trois... trente-neuf. C'est bien ça ?"

4. RECOMPTE AVANT DE PARLER.
   Avant chaque reformulation, recompte mentalement : il te faut 10 chiffres et 5 paires. Si tu n'en as plus 10, tu admets : "Excusez-moi, j'ai perdu un chiffre. Vous pouvez me redire le numéro en entier ?"

5. ATTENDS UNE CONFIRMATION EXPLICITE.
   "oui", "c'est ça", "tout à fait", "exactement". Si le client corrige, tu reformules ENTIÈREMENT le nouveau numéro corrigé et tu redemandes confirmation.

6. EN CAS DE DOUTE SUR UNE PAIRE.
   Si tu hésites entre deux paires similaires (trente-et-un / trente-neuf, soixante / soixante-dix, six / dix), tu demandes EN LETTRES, jamais en chiffres bruts :
   - OUI : "Excusez-moi, à la fin c'est trente-et-un ou trente-neuf ?"
   - OUI : "Au début c'est zéro-six ou zéro-neuf ?"
   - NON : "C'est 0 6 ou 0 9 ?" (ambigu à l'oreille)

7. FALLBACK ULTIME — chiffre par chiffre.
   Si après deux essais tu n'as toujours pas le bon numéro, tu changes de méthode :
   "Pour être sûre, on va le faire chiffre par chiffre, tranquillement. Vous me dites un chiffre, j'attends, vous me dites le suivant. Premier chiffre ?"
   Puis tu reformules à la fin par paires : "Donc ça nous fait zéro six, vingt-neuf, quatre-vingt-quatre, vingt-trois, trente-neuf. C'est bon ?"

Tu ne passes JAMAIS à l'étape suivante de la réservation tant que le numéro n'est pas confirmé sans correction par le client.`;

// === Consigne prononciation à injecter en tête de prompt ===
const PRONUNCIATION_BLOCK = `PRONONCIATION DES NOMS PROPRES — RÈGLE OBLIGATOIRE

Le restaurant s'écrit "Le Ti Taurus" mais se prononce "Tee-Tow-Russ" (trois syllabes : tee comme dans "thé", tow comme dans "tôt", russ avec un R doux).
À l'oral, tu dis TOUJOURS "Tee-Tow-Russ", JAMAIS "titre russe", JAMAIS "tee-toh-rüss", JAMAIS "ti-tau-rouss".
Quand tu dois nommer le restaurant à l'oral, écris-le phonétiquement dans ta réponse pour que la voix le prononce correctement.

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

const changes = [];

// === STEP 2 : Replace existing phone block ===
console.log('\n=== STEP 2 : Replace NUMÉROS DE TÉLÉPHONE block ===');
const phoneStart = sp.indexOf('NUMÉROS DE TÉLÉPHONE — RÈGLE ABSOLUE DE CONFIRMATION');
if (phoneStart < 0) {
  console.error('Phone section not found in systemPrompt');
  process.exit(1);
}
// Find the next blank line after the phone section, looking for "Tu reconfirmes" or "COMMANDES" or similar major heading
const phoneEndAnchors = ['\n\nTu reconfirmes à la fin', '\n\nCOMMANDES À EMPORTER', '\n\nCARTE\n', '\n\nSITUATIONS SPÉCIALES'];
let phoneEnd = -1;
for (const anchor of phoneEndAnchors) {
  const idx = sp.indexOf(anchor, phoneStart);
  if (idx > 0 && (phoneEnd === -1 || idx < phoneEnd)) phoneEnd = idx;
}
if (phoneEnd < 0) {
  console.error('Could not find end of phone section');
  process.exit(1);
}
const oldPhoneBlockLength = phoneEnd - phoneStart;
sp = sp.slice(0, phoneStart) + NEW_PHONE_BLOCK + sp.slice(phoneEnd);
changes.push(
  `phone block replaced: ${oldPhoneBlockLength} chars → ${NEW_PHONE_BLOCK.length} chars`,
);

// === STEP 3 : Inject pronunciation rule at top of persona section ===
console.log('\n=== STEP 3 : Inject pronunciation rule ===');
if (sp.includes('PRONONCIATION DES NOMS PROPRES')) {
  changes.push('pronunciation block already present, skipping');
} else {
  // Insert just before "COMMENT TU PARLES" (start of persona behavior rules)
  const personaAnchor = 'COMMENT TU PARLES';
  const idx = sp.indexOf(personaAnchor);
  if (idx < 0) {
    console.error('Anchor "COMMENT TU PARLES" not found');
    process.exit(1);
  }
  sp = sp.slice(0, idx) + PRONUNCIATION_BLOCK + sp.slice(idx);
  changes.push(`pronunciation block inserted before "COMMENT TU PARLES" (+${PRONUNCIATION_BLOCK.length} chars)`);
}

// === STEP 4 : Replace "le ti taurus" with "Tee-Tow-Russ" in spoken contexts ===
// We only replace in the firstMessage and not the contextSummary (which is informational)
console.log('\n=== STEP 4 : Fix firstMessage pronunciation ===');
const oldFirstMessage = assistant.firstMessage || '';
const newFirstMessage = oldFirstMessage
  .replace(/Le Ti Taurus/gi, 'Tee-Tow-Russ')
  .replace(/le ti taurus/gi, 'Tee-Tow-Russ');
if (newFirstMessage !== oldFirstMessage) {
  changes.push(`firstMessage: "${oldFirstMessage}" → "${newFirstMessage}"`);
}

// === STEP 5 : PATCH ===
console.log('\n=== STEP 5 : PATCH ===');
for (const c of changes) console.log(`  • ${c}`);
console.log(`  total systemPrompt: ${assistant.model?.systemPrompt?.length} → ${sp.length} chars`);

const patchBody = {
  firstMessage: newFirstMessage,
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
console.log(
  `  ✓ contains pronunciation rule:`,
  patched.model?.systemPrompt?.includes('PRONONCIATION DES NOMS PROPRES'),
);
console.log(
  `  ✓ contains new phone protocol:`,
  patched.model?.systemPrompt?.includes('LE PREMIER ZÉRO FAIT TOUJOURS PAIRE'),
);
