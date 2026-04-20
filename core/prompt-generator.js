/**
 * Prompt Generator - Génère des system prompts dynamiques basés sur templates
 */

const Handlebars = require('handlebars');

class PromptGenerator {
  constructor() {
    this.registerHelpers();
  }

  registerHelpers() {
    // Helper pour formater les services
    Handlebars.registerHelper('servicesList', function(services) {
      return services.map((service, index) => {
        const price = service.price > 0 ? `€${service.price}` : 'Gratuit';
        return `${index + 1}. ${service.name} — ${price} (${service.duration} min)`;
      }).join('\\n');
    });

    // Helper pour flow steps
    Handlebars.registerHelper('flowSteps', function(steps, timeouts) {
      return steps.map((step, index) => {
        const timeout = timeouts?.[index] || 30;
        return `### ETAPE ${index + 1}: ${step.toUpperCase()}\\nTimeout: ${timeout} secondes max`;
      }).join('\\n\\n');
    });

    // Helper pour champs requis
    Handlebars.registerHelper('requiredFields', function(fields) {
      return fields.map((field, index) => {
        return `${index + 1}. **${field.name}**: "${field.question}"`;
      }).join('\\n');
    });
  }

  generate(template, customConfig = {}) {
    // Version simplifiée du prompt
    return this.generateSimplePrompt(template, customConfig);
  }

  generateSimplePrompt(template, customConfig = {}) {
    const context = {
      ...template,
      ...customConfig,
      currentTime: new Date().toISOString(),
      currentDate: new Date().toLocaleDateString('fr-FR')
    };

    return `# SYSTEM PROMPT: ${context.bot.name} — ${context.metadata.name}

## INSTRUCTIONS CRITIQUES
- JAMAIS sauter les etapes du flux
- JAMAIS couper sans confirmation finale
${context.emergency?.enabled ? '- JAMAIS ignorer une urgence' : ''}
- JAMAIS accepter des dates/heures dans le passe

## PERSONA & COMPORTEMENT
**Nom:** ${context.bot.name}
**Role:** ${context.bot.role}
**Ton:** ${context.bot.tone}

**Message d'accueil:**
"${context.bot.greeting}"

## FLUX OBLIGATOIRE
Tu dois TOUJOURS suivre ce flux EXACT:
${context.flow.steps.map((step, i) => `${i + 1}. ${step.toUpperCase()}`).join(' → ')}

## SERVICES DISPONIBLES
${context.services.map((service, i) => {
  const price = service.price > 0 ? `${service.price}€` : 'Gratuit';
  return `${i + 1}. ${service.name} — ${price} (${service.duration} min)`;
}).join('\\n')}

${context.emergency?.enabled ? `
## URGENCES
**Mots-cles d'urgence:** ${context.emergency.keywords.join(', ')}
**Action:** ${context.emergency.action}
**Message:** "${context.emergency.message}"
` : ''}

${context.qualifying_questions ? `
## QUESTIONS DE QUALIFICATION
${context.qualifying_questions.map((q, i) => `${i + 1}. ${q}`).join('\\n')}
` : ''}

${context.problem_types ? `
## TYPES DE PROBLEMES
${context.problem_types.map((p, i) => `${i + 1}. ${p}`).join('\\n')}
` : ''}

## COLLECTE D'INFORMATIONS
**Champs obligatoires:**
${context.required_fields.map((field, i) => `${i + 1}. **${field.name}**: "${field.question}"`).join('\\n')}

**Une question a la fois:**
- Jamais cumuler plusieurs questions
- Attendre reponse avant suivante

## CONFIRMATION FINALE
**Template de confirmation:**
"${context.conversation.confirmation_template}"

**Message de fin:** "${context.conversation.goodbye_message}"

## CONFIGURATION TECHNIQUE
- **Modele:** ${context.vapi.model}
- **Temperature:** ${context.vapi.temperature}
- **Max tokens:** ${context.vapi.maxTokens}
- **Duree max:** ${context.flow.maxDuration} secondes

## REGLES D'OR
1. **FLUX STRICT:** ${context.flow.steps.join(' → ')}
2. **PAS DE RACCOURCI:** Jamais sauter des etapes
3. **CONFIRMATION OBLIGATOIRE:** Jamais terminer sans "Confirmez-vous?"
${context.emergency?.enabled ? `4. **URGENCES D'ABORD:** ${context.emergency.keywords[0]} = ${context.emergency.action}` : ''}
5. **DONNEES COMPLETES:** ${context.required_fields.map(f => f.name).join(' + ')} obligatoires
6. **DATES VALIDES:** Zero tolerance pour dates/heures passees
7. **UNE QUESTION A LA FOIS:** Jamais cumuler des questions

Non-respect = Appel echoue = Perte de vente`;
  }

  // Génère une config Vapi complète 
  generateVapiConfig(template, apiKeys) {
    return {
      assistant: {
        name: template.bot.name,
        firstMessage: template.bot.greeting,
        model: template.vapi.model,
        temperature: template.vapi.temperature,
        maxTokens: template.vapi.maxTokens,
        systemPrompt: this.generate(template)
      },
      voice: template.bot.voice,
      transcriber: {
        provider: "google",
        language: template.bot.voice.language
      },
      serverUrl: process.env.WEBHOOK_URL || "${WEBHOOK_URL}",
      serverUrlSecret: process.env.WEBHOOK_SECRET || "${WEBHOOK_SECRET}",
      ...apiKeys
    };
  }
}

module.exports = PromptGenerator;