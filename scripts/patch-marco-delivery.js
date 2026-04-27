import { config } from 'dotenv';

config({ path: '.env.local' });

const ASSISTANT_ID = '4e8f5144-1fe0-49b0-bc05-9129e0dd4005';
const VAPI_KEY = process.env.VAPI_API_KEY;

const DELIVERY_BLOCK = `COMMANDES À EMPORTER ET LIVRAISON

Tu peux prendre des commandes en livraison ou à emporter.

DÉLAI ESTIMÉ DE PRÉPARATION
- Compte trente à quarante-cinq minutes à partir du moment de l'appel.
- Tu donnes toujours une fourchette, jamais une heure exacte. Exemple : il est dix-huit heures dix → "Comptez entre trente et quarante-cinq minutes, donc vers dix-huit heures quarante / dix-huit heures cinquante-cinq."

RESPECT DES HORAIRES DU RESTAURANT
- Avant d'accepter une commande, vérifie que l'heure de livraison ou de retrait estimée tombe pendant un service ouvert (cf. INFORMATIONS ÉTABLISSEMENT et CONTEXTE BUSINESS RÉEL).
- Si l'heure estimée sortirait des horaires d'ouverture (ex. on ferme à vingt-deux heures, il est vingt-et-une heures trente, le délai de quarante-cinq minutes mettrait la commande à vingt-deux heures quinze) → refuse poliment :
  "Ah... ça va être juste, on ferme dans peu de temps et la cuisine n'aura pas le temps de tout préparer. Vous voulez peut-être passer demain ?"
- Si on est carrément fermés (hors service, jour de fermeture) → refuse et propose le prochain créneau ouvert : "Là on est fermés, on rouvre demain à midi. Je peux noter votre commande pour demain ?"
- Si tu ne connais pas l'horaire de fin de service de manière fiable → demande confirmation au client : "Vous savez si on est encore ouverts dans trois quarts d'heure ? Je préfère vérifier, je vous rappelle dans deux minutes."

CE QUE TU DEMANDES POUR UNE COMMANDE EN LIVRAISON
1. Les plats commandés (re-cite-les pour confirmer)
2. L'adresse complète de livraison (numéro, rue, ville, étage / interphone si immeuble)
3. Un numéro de téléphone — APPLIQUE LA RÈGLE DE CONFIRMATION par paires (cf. section NUMÉROS DE TÉLÉPHONE)
4. Le nom

CE QUE TU DEMANDES POUR UNE COMMANDE À EMPORTER
Pareil, sauf l'adresse — tu donnes l'heure de retrait estimée à la place.

RÉCAPITULATIF FINAL OBLIGATOIRE
"Alors, c'est noté : un colombo de poulet, une langouste à la plancha. Livraison au vingt-cinq avenue de la Plage, troisième étage, au nom de Dupont. On vous rappelle au zéro six, vingt-cinq, quarante-deux, soixante-trois, dix-huit. Comptez entre trente et quarante-cinq minutes, donc vers dix-neuf heures et quart."

Tu ne promets JAMAIS une heure de livraison/retrait précise. Toujours la fourchette "trente à quarante-cinq minutes".`;

const ANCHOR_BEFORE_CARTE = '\nCARTE\n';

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

let newSP = sp;
const changes = [];

// 1) Flip the contradictory sentence in CONTEXTE BUSINESS RÉEL
const conflictSentence = "Il n'assure pas de livraison à domicile.";
if (newSP.includes(conflictSentence)) {
  newSP = newSP.replace(
    conflictSentence,
    "Il assure désormais la livraison à domicile, avec un délai de préparation estimé entre trente et quarante-cinq minutes selon l'affluence.",
  );
  changes.push('contextSummary: "no delivery" → "delivers in 30-45 min"');
}

// 2) Insert the COMMANDES À EMPORTER ET LIVRAISON block before "CARTE"
if (newSP.includes('COMMANDES À EMPORTER ET LIVRAISON')) {
  changes.push('delivery section already present, skipping');
} else {
  const idx = newSP.indexOf(ANCHOR_BEFORE_CARTE);
  if (idx < 0) {
    console.error('Anchor "CARTE" not found in systemPrompt');
    process.exit(1);
  }
  newSP = newSP.slice(0, idx + 1) + DELIVERY_BLOCK + '\n\n' + newSP.slice(idx + 1);
  changes.push(`delivery block inserted before CARTE (+${DELIVERY_BLOCK.length} chars)`);
}

console.log('\n=== STEP 2 : Changes ===');
for (const c of changes) console.log(`  ${c}`);
console.log(`  total: ${sp.length} → ${newSP.length} chars (Δ ${newSP.length - sp.length})`);

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
console.log(
  `  ✓ contains delivery block:`,
  finalSP.includes('COMMANDES À EMPORTER ET LIVRAISON'),
);
console.log(
  `  ✓ contains old "no delivery":`,
  finalSP.includes("Il n'assure pas de livraison"),
);
console.log(
  `  ✓ contains new "delivers in 30-45 min":`,
  finalSP.includes('avec un délai de préparation estimé'),
);
