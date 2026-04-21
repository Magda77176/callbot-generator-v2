# 🎯 CallBot Generator V2

**Générateur de CallBots IA personnalisés pour différents secteurs d'activité.**

## 🚀 Fonctionnalités

### CallBots Pré-configurés
- **🦷 Dentaire** - Tom, assistant de cabinet dentaire
- **🍽️ Restaurant** - Marco, assistant restaurant 
- **✂️ Coiffeur** - Léa, assistante salon de coiffure
- **🏠 Immobilier** - Alex, assistant agence immobilière  
- **📦 E-commerce** - Sophie, assistante boutique en ligne

### Personnalisation Automatique
- Injection des informations business (nom, adresse, horaires)
- Prompts système adaptés au secteur
- Voix française naturelle (Cartesia)
- Transcription français (Deepgram)

## 🏗️ Architecture

```
├── api/
│   └── deploy-vapi-v2.js      # API de déploiement Vercel
├── public/
│   └── deploy-interface.html  # Interface web de génération
├── core/
│   └── callbot-configs.js     # Configurations par secteur
└── templates/
    └── prompts/               # Templates de prompts
```

## 🛠️ Installation

```bash
# Cloner le repo
git clone [URL_REPO]
cd callbot-generator-v2

# Installer les dépendances
npm install

# Déployer sur Vercel
vercel --prod
```

## 🎯 Utilisation

### Via Interface Web
1. Accéder à l'interface déployée
2. Choisir le secteur d'activité  
3. Saisir la clé API Vapi
4. Remplir les infos business
5. Cliquer "Déployer"
6. Récupérer l'Assistant ID et le numéro de téléphone

### Configuration Webhook (Optionnel)
Pour recevoir les logs d'appels :
```bash
# Webhook URL
https://your-domain.com/webhook/vapi

# Handler inclus dans le repo
webhook-vapi-handler.js
```

## 🔧 Configuration

### Variables d'environnement
- `VAPI_API_KEY` - Clé API Vapi.ai
- `WEBHOOK_SECRET` - Secret pour webhook (optionnel)

### Personnalisation CallBot
Modifier `core/callbot-configs.js` :
```javascript
{
  secteur: {
    name: 'Nom Assistant',
    greeting: 'Message d\'accueil...',
    systemPrompt: 'Instructions système...'
  }
}
```

## 🎭 Exemple d'Assistant Généré

**CallBot Dentaire "Tom" :**
- **Numéro :** +33 1 XX XX XX XX  
- **Capacités :** Prise RDV, gestion urgences, infos soins
- **Personnalité :** Professionnel et rassurant
- **Langue :** Français natif

## 🔗 Intégrations

- **Vapi.ai** - Plateforme CallBot
- **Cartesia** - Synthèse vocale française
- **Deepgram** - Reconnaissance vocale
- **Vercel** - Hébergement interface

## 📊 Monitoring

Les CallBots générés peuvent envoyer des webhooks avec :
- Début/fin d'appel
- Transcription en temps réel  
- Résumés de conversation
- Métriques de performance

## 🛡️ Sécurité

- Clés API non stockées côté serveur
- Webhooks sécurisés par secret
- HTTPS obligatoire pour production

## 🔄 Mises à jour

Pour mettre à jour les prompts :
1. Modifier `core/callbot-configs.js`
2. Redéployer sur Vercel
3. Les nouveaux CallBots utiliseront la nouvelle version

---

## Stack technique (v2)

Refonte en cours : migration de l'interface statique vers une app Next.js 15.

- **Framework :** Next.js 15 (App Router) + React 19
- **UI :** shadcn/ui + Tailwind CSS v4
- **Test vocal :** Vapi Web SDK (`@vapi-ai/web`)
- **TypeScript :** strict, pas de `any`
- **Déploiement :** Vercel (détection Next.js auto)

### Variables d'environnement Vercel

| Variable | Rôle | Côté |
|---|---|---|
| `VAPI_API_KEY` | Clé privée Vapi pour déploiement d'assistants | serveur uniquement |
| `VAPI_WEBHOOK_SECRET` | Secret HMAC pour vérification webhook | serveur uniquement |
| `VAPI_PUBLIC_KEY` | Clé publique Vapi pour Web Call (test vocal) | exposée au client via route |

**Important :** `VAPI_PUBLIC_KEY` doit être ajoutée aux env vars Vercel avant Release 1.

---

**Développé par :** Sullivan  
**Contact :** sullivan.magdaleone@gmail.com
**Version :** 2.0