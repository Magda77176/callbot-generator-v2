import { config } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

config({ path: '.env.local' });

const ASSISTANT_ID = '4e8f5144-1fe0-49b0-bc05-9129e0dd4005';
const VAPI_KEY = process.env.VAPI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const DFS_AUTH =
  'Basic ' +
  Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`,
  ).toString('base64');

const MENU = `Nos tapas
Accras De Morue
Végétarien
Rillette De Poisson Frais Et Ses Toasts Grillés
Végétarien
Couteaux Persillés
Végétarien
Tempura De Crevettes
Végétarien
Assiette De Frites Maison
Végétarien

Nos salades
Poisson Fumé — Poisson fumé frais local et ses crudités
Végétarien
La Normande — Camembert entier frit et coulant, lardons, confiture de fruits rouges, toasts grillés et crudités
Fraicheur — Tartare de poisson frais et crudités

Côté mer
Brochette De St Jacques Et Crevettes Sauce Chorizo Maison
Langouste Entière Grillée À La Plancha
Gambas Flambées Au Rhum Vieux
Végétarien
Fricassé De Lambis
Végétarien
Steak De Thon Frais
Végétarien
Steak De Thon Frais Rossini
Poisson Lion Entier Grillé
Végétarien

Côté Terre
Entrecôte Fraîche
Magret De Canard Entier
Brochette De Poire De Bœuf Et Chorizo
Brochette De Poulet Ananas Bacon Poivrons
Gigot D'agneau Grillé
Colombo De Poulet

NOTE : prix non communiqués pour cette mise à jour. Les tags "Végétarien" issus du copier-coller GMB sont visiblement erronés sur plusieurs plats à base de viande/poisson — à ignorer dans la synthèse.`;

console.log('=== STEP 1 : DataForSEO GMB lookup ===');
const dfsRes = await fetch(
  'https://api.dataforseo.com/v3/business_data/google/my_business_info/live',
  {
    method: 'POST',
    headers: { Authorization: DFS_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { keyword: 'le ti taurus', location_code: 2250, language_code: 'fr' },
    ]),
  },
);
const dfs = await dfsRes.json();
const item = dfs?.tasks?.[0]?.result?.[0]?.items?.[0];
if (!item) {
  console.error('DFS returned no item');
  process.exit(1);
}
console.log('  ✓ DFS:', item.title, '—', item.category);

const dfsBlock = JSON.stringify(
  {
    nom: item.title,
    categorie: item.category,
    adresse: item.address,
    telephone: item.phone,
    site_web: item.url,
    horaires: item.work_hours,
    note: item.rating,
    description: item.description,
    attributs: item.attributes,
    liens: item.local_business_links,
  },
  null,
  2,
);

const sourcesBlock = `## SOURCE: DATAFORSEO_GMB\n${dfsBlock}\n\n---\n\n## SOURCE: MENU_MANUAL\n${MENU}`;

console.log('\n=== STEP 2 : Claude synthesis (sonnet 4.6) ===');
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
const msg = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 2500,
  messages: [
    {
      role: 'user',
      content: `Tu es un assistant qui synthétise des informations business pour alimenter un CallBot vocal IA français.

NOM DE L'ÉTABLISSEMENT : Le Ti Taurus

SOURCES BRUTES COLLECTÉES :
${sourcesBlock}

Rédige une section "CONTEXTE BUSINESS RÉEL" en prose française naturelle (pas de bullets, pas de listes, pas de markdown), qui synthétise TOUT ce que le CallBot doit savoir pour être crédible au téléphone :
- Nature exacte de l'activité et catégorie
- Adresse complète et moyens d'accès
- Horaires d'ouverture précis avec jours de fermeture
- Téléphone, email si disponibles
- Plats, menus et prix précis (TRÈS IMPORTANT si la source menu_manual existe : liste explicitement les plats avec leurs noms exacts et catégories tapas/salades/côté mer/côté terre)
- Services et prestations annexes (livraison, réservation en ligne, événements privés)
- Équipe, chef, gérant si mentionnés
- Événements spéciaux en cours
- Avis clients (score, points forts cités)
- Attributs particuliers (terrasse, parking, wifi, accès PMR...)

Si une source menu_manual ou menu_from_gmb est présente, tu DOIS inclure dans ta synthèse TOUS les plats listés (ou les regrouper par catégorie si très nombreux). Le CallBot doit pouvoir répondre naturellement à "qu'est-ce que vous avez comme plat aujourd'hui" ou "vous avez quelque chose pour les amateurs de poisson ?".

PRIORITÉ DES SOURCES sur le menu :
1. menu_manual (collé par le restaurateur) = source de vérité ABSOLUE — recopie les plats tels quels, sans paraphraser ni omettre. Si les prix sont absents, ne les invente pas — précise simplement "prix sur demande" en fin de section.
2. autres sources = pour le contexte général uniquement, jamais pour inventer des plats ou des prix

N'invente JAMAIS d'information non présente dans les sources. Si une info manque, ne l'évoque pas (ou dit "non communiqué").
Écris de façon fluide et factuelle, max 600 mots. Commence directement par la synthèse, sans préambule.`,
    },
  ],
});
const newContext = msg.content[0].type === 'text' ? msg.content[0].text : '';
console.log(
  `  ✓ Synthèse : ${newContext.length} chars, ${msg.usage?.input_tokens} input + ${msg.usage?.output_tokens} output tokens`,
);

console.log('\n=== STEP 3 : GET current assistant ===');
const aRes = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
  headers: { Authorization: `Bearer ${VAPI_KEY}` },
});
if (!aRes.ok) {
  console.error('GET failed:', aRes.status, await aRes.text());
  process.exit(1);
}
const assistant = await aRes.json();
const currentSP = assistant.model?.systemPrompt || '';
console.log(`  ✓ current systemPrompt: ${currentSP.length} chars`);

console.log('\n=== STEP 4 : Splice new CONTEXTE BUSINESS RÉEL ===');
const ctxStart = currentSP.indexOf('CONTEXTE BUSINESS RÉEL');
if (ctxStart < 0) {
  console.error('CONTEXTE BUSINESS RÉEL header not found');
  process.exit(1);
}
const ctxEnd = currentSP.indexOf('\n---', ctxStart);
if (ctxEnd < 0) {
  console.error('--- separator after CONTEXTE BUSINESS RÉEL not found');
  process.exit(1);
}

const before = currentSP.slice(0, ctxStart);
const after = currentSP.slice(ctxEnd);
const newSP = `${before}CONTEXTE BUSINESS RÉEL\n\n${newContext}${after}`;
console.log(`  before: ${before.length} chars`);
console.log(`  new ctx: ${newContext.length} chars`);
console.log(`  after: ${after.length} chars`);
console.log(`  new total: ${newSP.length} chars (was ${currentSP.length})`);

console.log('\n=== STEP 5 : PATCH assistant ===');
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
console.log(
  `  ✓ PATCH OK — systemPrompt now ${finalSP.length} chars`,
);

console.log('\n=== Sanity checks on new prompt ===');
const dishes = [
  'accras', 'rillette', 'couteaux', 'tempura', 'frites',
  'normande', 'tartare', 'st jacques', 'langouste', 'gambas',
  'lambis', 'thon', 'poisson lion', 'entrecôte', 'magret',
  'brochette', 'gigot', 'colombo',
];
let hits = 0;
for (const d of dishes) {
  if (finalSP.toLowerCase().includes(d)) hits++;
}
console.log(`  plats détectés dans le nouveau prompt : ${hits} / ${dishes.length}`);

console.log('\n=== Extrait nouvelle section CONTEXTE BUSINESS RÉEL ===');
const newCtxStart = finalSP.indexOf('CONTEXTE BUSINESS RÉEL');
const newCtxEnd = finalSP.indexOf('\n---', newCtxStart);
console.log(finalSP.slice(newCtxStart, newCtxEnd));
