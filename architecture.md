# CallBot Generator V2 — Architecture Modulaire

## 🎯 Vision
Fusionner la **tech de Mindy** (callbot-tom) avec le **wizard UI** existant pour créer un générateur de callbots scalable.

## 📁 Structure

```
callbot-generator-v2/
├── core/                    # Tech fixe (Mindy)
│   ├── vapi-integration.js
│   ├── flow-validation.js
│   └── temporal-validator.js
├── templates/               # Contextes modulaires
│   ├── dentaire.json
│   ├── immobilier.json
│   ├── medical.json
│   └── ecommerce.json
├── ui/                      # Interface wizard
│   ├── step1-client.tsx
│   ├── step2-persona.tsx
│   ├── step3-services.tsx
│   └── step4-generation.tsx
└── generator/
    ├── prompt-generator.js  # Template → System prompt
    ├── config-generator.js  # Template → Vapi config
    └── deployment.js        # Deploy sur Vapi
```

## 🔧 Templates JSON

### Template Dentaire (based on Mindy)
```json
{
  "sector": "dentaire",
  "bot": {
    "name": "Tom",
    "role": "Assistant vocal dentaire",
    "greeting": "Bonjour! Je m'appelle Tom, l'assistant vocal du cabinet dentaire."
  },
  "services": [
    {"id": "consultation", "name": "Consultation", "price": 50, "duration": 30},
    {"id": "detartrage", "name": "Détartrage", "price": 80, "duration": 45}
  ],
  "flow": ["accueil", "triage", "besoin", "collecte", "confirmation"],
  "emergencies": ["douleur extrême", "infection", "saignement"],
  "required_fields": ["firstName", "lastName", "phoneNumber"]
}
```

### Template Immobilier (nouveau)
```json
{
  "sector": "immobilier",
  "bot": {
    "name": "Sophie",
    "role": "Assistante commerciale immobilier",
    "greeting": "Bonjour! Je suis Sophie, votre assistante pour vos projets immobiliers."
  },
  "services": [
    {"id": "estimation", "name": "Estimation gratuite", "price": 0, "duration": 30},
    {"id": "visite", "name": "Visite personnalisée", "price": 0, "duration": 60}
  ],
  "flow": ["accueil", "qualification", "besoin", "collecte", "confirmation"],
  "qualifying_questions": [
    "Recherchez-vous à acheter ou vendre ?",
    "Dans quelle zone géographique ?",
    "Quel est votre budget ?"
  ],
  "required_fields": ["firstName", "lastName", "phoneNumber", "budget", "zone"]
}
```

## ⚙️ Générateur Modulaire

### 1. Core Flow Engine (Mindy's logic)
```javascript
// core/flow-validation.js
export class FlowValidator {
  constructor(template) {
    this.steps = template.flow;
    this.required = template.required_fields;
  }
  
  validateStep(step, data) {
    // Logique de validation de Mindy
  }
  
  validateTemporal(date, time) {
    // Validation temporelle stricte de Mindy
  }
}
```

### 2. Template → Prompt Generator
```javascript
// generator/prompt-generator.js
export function generateSystemPrompt(template, clientConfig) {
  return `
# SYSTEM PROMPT: ${template.bot.name} — ${template.sector}

## FLUX OBLIGATOIRE
${template.flow.map((step, i) => `
### ÉTAPE ${i+1}: ${step.toUpperCase()}
`).join('')}

## SERVICES DISPONIBLES
${template.services.map(s => `
${s.name} — €${s.price} (${s.duration} min)
`).join('')}

## DONNÉES REQUISES
${template.required_fields.join(', ')}
`;
}
```

### 3. UI Wizard (existing + enhanced)
- **Step 1** : Client info + template selection
- **Step 2** : Bot persona + greeting customization  
- **Step 3** : Services configuration (editable list)
- **Step 4** : Generate + deploy

## 🚀 Avantages

✅ **Tech éprouvée** : Logic de Mindy (validation, flux, temporal)  
✅ **UI scalable** : Wizard existant  
✅ **Templates flexibles** : 1 JSON = 1 nouveau secteur  
✅ **Deploy automatique** : Vapi integration ready  

## 🎯 Next Steps

1. **Copier le core de Mindy** (flow, validation, temporal)
2. **Adapter les templates** avec structure JSON
3. **Modifier le wizard** pour template selection
4. **Test avec secteur dentaire** (baseline Mindy)
5. **Ajouter immobilier** (nouveau template)

Tu veux que je commence par quoi ?