# 🤖 CallBot Generator V2 - Template Driven

Générateur de callbots modulaire qui transforme la configuration hard-codée de Mindy en système template-driven scalable.

## 🎯 Problème résolu

**Avant (Mindy) :**
```javascript
// Hard-codé secteur dentaire uniquement
"Services disponibles:"
1. Consultation générale — €50 (30 min)
2. Détartrage/Hygiène — €80 (45 min)
// ... impossible d'adapter pour immobilier, e-commerce, etc.
```

**Maintenant (V2) :**
```json
// 1 template JSON = 1 nouveau secteur
{
  "services": [
    {"name": "Estimation gratuite", "price": 0, "duration": 30}
  ]
}
```

## 🏗 Architecture

```
callbot-generator-v2/
├── templates/          # Secteurs configurables
│   ├── dentaire.json   # Cabinet dentaire (base Mindy)
│   ├── immobilier.json # Agence immobilière  
│   └── ecommerce.json  # Support client e-commerce
├── core/               # Tech réutilisée
│   ├── flow-engine.js  # Logique de flux (de Mindy)
│   └── prompt-generator.js # Génération dynamique
├── generated/          # CallBots générés
└── generator.js        # CLI principal
```

## 🚀 Usage

### Installation
```bash
cd callbot-generator-v2
npm install
```

### Génération rapide
```bash
# Lister les templates
node generator.js --list-templates

# Générer un callbot
node generator.js --template dentaire
node generator.js --template immobilier

# Mode interactif
node generator.js
```

### Résultat généré
Chaque callbot génère :
- ✅ **system-prompt.txt** : Prompt optimisé pour le secteur
- ✅ **vapi-config.json** : Configuration Vapi clé-en-main
- ✅ **template.json** : Template final avec customisations
- ✅ **test-flow.js** : Test local du flux conversationnel
- ✅ **example.html** : Intégration web directe
- ✅ **README.md** : Instructions de déploiement

## 📋 Templates disponibles

### 🏥 Dentaire (base Mindy)
```json
{
  "bot": {"name": "Tom", "role": "Assistant vocal dentaire"},
  "services": [
    {"name": "Consultation générale", "price": 50, "duration": 30},
    {"name": "Urgence dentaire", "price": 75, "duration": 30}
  ],
  "flow": ["accueil", "triage", "besoin", "collecte", "confirmation"],
  "emergency": {"enabled": true, "keywords": ["douleur extrême", "infection"]}
}
```

### 🏠 Immobilier (nouveau)
```json
{
  "bot": {"name": "Sophie", "role": "Assistante commerciale immobilier"},
  "services": [
    {"name": "Estimation gratuite", "price": 0, "duration": 30},
    {"name": "Visite", "price": 0, "duration": 60}
  ],
  "flow": ["accueil", "qualification", "besoin", "collecte", "confirmation"],
  "qualifying_questions": ["Achat ou vente ?", "Zone ?", "Budget ?"]
}
```

### 📦 E-commerce (SAV)
```json
{
  "bot": {"name": "Alex", "role": "Assistant support client"},
  "services": [
    {"name": "Suivi commande", "price": 0, "duration": 15},
    {"name": "Retour/Échange", "price": 0, "duration": 30}
  ],
  "flow": ["accueil", "identification", "probleme", "resolution", "confirmation"],
  "problem_types": ["Commande non reçue", "Produit défectueux"]
}
```

## ⚙️ Personnalisation

### Créer un nouveau template
```bash
cp templates/dentaire.json templates/mon-secteur.json
# Éditer mon-secteur.json
node generator.js --template mon-secteur
```

### Configuration custom
```javascript
const generator = new CallBotGenerator();

await generator.generateCallBot('dentaire', {
  bot: {
    name: "Marie",
    greeting: "Bonjour, ici Marie du cabinet dentaire !"
  },
  services: [
    // Vos services personnalisés
  ]
});
```

## 🔧 Core Features (de Mindy)

✅ **Validation temporelle stricte** : Rejet dates/heures passées  
✅ **Flow en 5 étapes obligatoires** : Aucune étape sautée  
✅ **Détection d'urgences** : Transfer automatique SAMU  
✅ **Collecte structurée** : Champs requis validés  
✅ **Confirmation finale** : Aucun raccroché sans confirmation  

## 📊 Test & Debug

### Test local du flow
```bash
cd generated/dentaire
node test-flow.js
```

Simule une conversation complète et affiche :
- Étapes du flow
- Réponses du bot
- Données collectées
- Validation des transitions

### Intégration web
```html
<!-- Copier-coller example.html -->
<script src="https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js"></script>
```

## 🎯 Avantages V2

| Aspect | Mindy (V1) | Generator V2 |
|--------|------------|--------------|
| **Scalabilité** | 1 secteur (dentaire) | N secteurs (JSON) |
| **Maintenance** | Hard-code à modifier | Template à dupliquer |
| **Déploiement** | Manual | Automatique |
| **Testing** | Aucun | Flow simulator |
| **Customization** | Recompilation | Configuration |

## 🚀 Roadmap

- [ ] **UI Web** : Interface wizard pour créer templates
- [ ] **API REST** : Génération via HTTP endpoints
- [ ] **Auto-deploy** : Push direct sur Vapi
- [ ] **Analytics** : Tracking des conversations par template
- [ ] **A/B Testing** : Variants de prompts automatiques

## 💡 Exemples d'usage

```bash
# Cabinet dentaire classique
node generator.js --template dentaire

# Agence immo Lyon avec custom bot
node generator.js --template immobilier
# Puis éditer: bot.name = "Sophie Lyon", services += "Gestion locative"

# Support e-commerce avec problèmes spécifiques
node generator.js --template ecommerce  
# Puis éditer: problem_types += "Problème de paiement"

# Nouveau secteur : restaurant
cp templates/dentaire.json templates/restaurant.json
# Éditer: services = ["Réservation table", "Menu du jour", "Événement privé"]
node generator.js --template restaurant
```

## 🏆 Résultat

**1 template JSON + 1 commande = CallBot production-ready**

Plus besoin de recoder pour chaque secteur ! 🚀

---

**Créé par :** Mal & Jarvis  
**Inspiré de :** CallBot Tom (Mindy)  
**Tech :** Node.js, Handlebars, Vapi AI  
**Licence :** MIT