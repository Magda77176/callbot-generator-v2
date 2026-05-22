# CallBot Generator V2

Builder Next.js 16 pour créer et tester des assistants vocaux Vapi multi-secteurs (restaurant, coiffeur, dentaire, immobilier, e-commerce). Wizard 4 étapes, enrichissement business automatique via DataForSEO + Claude Sonnet, switcher de voix A/B en direct (Cartesia, ElevenLabs).

## Personas

| Secteur | Agent | Voix par défaut |
|---|---|---|
| Restaurant | Marco | Friendly French Man (Cartesia sonic-3) |
| Coiffeur | Léa | Helpful French Lady (Cartesia sonic-3) |
| Dentaire | Tom | Julien — Polished Partner (Cartesia sonic-3) |
| Immobilier | Alex | Vincent (Cartesia sonic-3) |
| E-commerce | Sophie | Eloise — Dialogue Anchor (Cartesia sonic-3) |

Chaque persona a un greeting et un `systemPrompt` en prose française (pas de bullets/markdown à l'oral) optimisés pour la téléphonie.

## Stack technique

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4 + shadcn/ui (preset base-nova)
- Vapi — orchestration vocale et téléphonie
- Cartesia (TTS sonic-3) et ElevenLabs (turbo_v2_5, multilingual_v2)
- Deepgram nova-2 (transcription FR)
- Anthropic Claude Sonnet 4.6 (synthèse du contexte business)
- DataForSEO Live (lookup Google My Business)
- `@vapi-ai/web` (Web Call SDK pour les tests dans le navigateur)

## Architecture

```
app/
  api/
    deploy-vapi/route.ts         POST  crée un assistant Vapi
    enrich-business/route.ts     POST  DataForSEO + scrape + Claude synthesis
    switch-voice/route.ts        POST  PATCH voice du bot live (proxy serveur)
    vapi-token/route.ts          GET   expose VAPI_PUBLIC_KEY pour Web SDK
  builder/page.tsx               Wizard 4 étapes
  test/[assistantId]/page.tsx    Page de test vocal + switcher A/B
components/
  builder/                       step-template / step-business / step-customize / step-review
  voice-tester.tsx               Web Call + transcript live + estimation coût
  ui/                            primitives shadcn
lib/
  callbot-configs.ts             5 personas (greeting, systemPrompt, types BusinessInfo)
  context-enricher.ts            orchestration enrichissement
  dataforseo-client.ts           wrapper Google My Business Info API
  input-detector.ts              détecte type d'URL ou nom (Maps, Pages Jaunes, etc.)
  voices.ts                      catalogue voix Cartesia FR sélectionnées
  builder-types.ts               types wizard (BuilderState, ModelOption…)
scripts/
  list-cartesia-voices.js        énumère le catalogue Cartesia FR (filtre blacklist)
  patch-vapi-assistant.js        outil one-shot pour patcher un bot live
```

## Variables d'environnement

Créer `.env.local` (jamais commit, déjà ignoré par `.gitignore`) :

| Variable | Rôle | Côté |
|---|---|---|
| `VAPI_API_KEY` | Clé privée Vapi (POST/PATCH /assistant) | serveur |
| `VAPI_WEBHOOK_SECRET` | HMAC de vérification webhook | serveur |
| `VAPI_PUBLIC_KEY` | Clé publique pour Web Call SDK | exposée via `/api/vapi-token` |
| `ANTHROPIC_API_KEY` | Synthèse Claude Sonnet du contexte business | serveur |
| `DATAFORSEO_LOGIN` | Email du compte DataForSEO | serveur |
| `DATAFORSEO_PASSWORD` | **Password réel** (pas la base64 affichée dans le dashboard) | serveur |
| `CARTESIA_API_KEY` | Utilisé uniquement par `scripts/list-cartesia-voices.js` | local |

Les mêmes variables (sans `CARTESIA_API_KEY`) doivent être déclarées côté Vercel Production.

## Commandes

```bash
npm install
npm run dev                              # Next.js + Turbopack sur localhost:3000
npm run build                            # build production
npm run start                            # serve build
node scripts/list-cartesia-voices.js     # liste les voix FR utilisables
node scripts/patch-vapi-assistant.js     # patch ad-hoc d'un bot live (édite l'ID en haut)
```

## Flow utilisateur

1. `/` → redirige vers `/builder`
2. **Étape 1 — Template** : choix du persona (5 cards avec preview)
3. **Étape 2 — Établissement** : nom, adresse, téléphone, horaires + un champ unique « Nom ou lien de votre établissement » accepté en : nom seul, Google Maps, Pages Jaunes, TripAdvisor, TheFork, Yelp, site web, etc. Facebook/Instagram optionnels. Bouton « Enrichir le contexte » → DataForSEO Live + scrape éventuel + synthèse Claude (5 à 40 secondes)
4. **Étape 3 — Personnalisation** : prompt système éditable, sélecteur Homme/Femme avec voix Cartesia filtrée, modèle LLM, température
5. **Étape 4 — Review + déploiement** : récap puis POST `/api/deploy-vapi` → redirection vers `/test/[id]`
6. **Test vocal** : Web Call Vapi en navigateur, transcript live, durée, coût estimé, switcher A/B voix (Vincent Cartesia, Hugo ElevenLabs, Lucie ElevenLabs)

## Sécurité

- Aucune clé API exposée côté client à l'exception de `VAPI_PUBLIC_KEY`, servie via `/api/vapi-token`
- Le switch de voix passe par le proxy serveur `/api/switch-voice` qui maintient une allowlist de presets : le client ne peut envoyer qu'un `presetId`, jamais un objet voix arbitraire
- Endpoints renvoient `503` si une env var critique manque (pas de crash silencieux)
- Webhook Vapi vérifié par HMAC via `VAPI_WEBHOOK_SECRET`

---

**Développé par** Sullivan — sullivan.magdaleone@gmail.com
