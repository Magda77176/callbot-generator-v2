/**
 * Prompt Generator V2 - Génère des system prompts depuis templates JSON
 */

const Handlebars = require('handlebars');

class PromptGeneratorFixed {
  constructor() {
    this.registerHelpers();
  }

  registerHelpers() {
    // Helper pour formater les variables
    Handlebars.registerHelper('variables', function(contextVars) {
      if (!contextVars) return '';
      return Object.keys(contextVars).map(key => `**${key}:** {{${key}}}`).join('\n');
    });

    // Helper pour les flows
    Handlebars.registerHelper('flowSteps', function(steps) {
      if (!Array.isArray(steps)) return 'Pas de flux défini';
      return steps.map((step, i) => `${i + 1}. ${step.name || step}`.toUpperCase()).join(' → ');
    });
  }

  generateFromTemplate(template, variables = {}) {
    console.log(`📝 Génération prompt pour template: ${template.metadata.template_name}`);
    
    const context = this.buildContext(template, variables);
    const systemPrompt = this.buildSystemPrompt(context);
    
    console.log(`✅ Prompt généré: ${systemPrompt.length} caractères`);
    return systemPrompt;
  }

  buildContext(template, variables) {
    // Merge template avec variables utilisateur
    const context = {
      metadata: template.metadata,
      bot_config: template.bot_config,
      conversation_flows: template.conversation_flows,
      variables: {
        ...template.bot_config.context_variables,
        ...variables
      },
      currentDate: new Date().toLocaleDateString('fr-FR'),
      currentTime: new Date().toISOString()
    };

    return context;
  }

  buildSystemPrompt(context) {
    const botName = context.bot_config?.name || 'Assistant';
    const botPersonality = context.bot_config?.personality || 'Professionnel';
    
    return `# SYSTEM PROMPT: ${botName} — ${context.metadata.template_name}

## IDENTITÉ & PERSONNALITÉ
**Nom:** ${botName}
**Rôle:** ${context.bot_config?.voice_tone || 'Assistant professionnel'}
**Personnalité:** ${botPersonality}

## MISSION PRINCIPALE
${context.metadata.description}

## MESSAGE D'ACCUEIL
${context.conversation_flows?.greeting?.message || 'Bonjour ! Comment puis-je vous aider ?'}

## FLUX DE CONVERSATION DISPONIBLES
${this.buildConversationFlows(context.conversation_flows)}

## VARIABLES CONTEXTUELLES
${this.buildVariables(context.variables)}

## GESTION DES OBJECTIONS
${this.buildObjectionHandling(context.objection_handling)}

## COLLECTE DE DONNÉES
${this.buildDataCollection(context.data_collection)}

## WEBHOOKS & INTÉGRATIONS
${this.buildWebhooks(context.integration_webhooks)}

## ENRICHISSEMENT CONTEXTUEL
${this.buildEnrichment(context.context_enrichment)}

---
**Template:** ${context.metadata.template_name} v${context.metadata.version}
**Généré le:** ${context.currentDate}`;
  }

  buildConversationFlows(flows) {
    if (!flows) return 'Aucun flux défini';
    
    let output = '';
    
    Object.keys(flows).forEach(flowName => {
      const flow = flows[flowName];
      
      if (flow.trigger_keywords) {
        output += `\n### ${flowName.toUpperCase()}\n`;
        output += `**Déclencheurs:** ${flow.trigger_keywords.join(', ')}\n`;
        
        if (flow.questions) {
          output += `**Questions à poser:**\n`;
          flow.questions.forEach((q, i) => {
            output += `${i + 1}. ${q.question} (${q.field})\n`;
          });
        }
        
        if (flow.confirmation) {
          output += `**Confirmation:** ${flow.confirmation}\n`;
        }
        
        if (flow.response) {
          output += `**Réponse type:** ${flow.response}\n`;
        }
        output += '\n';
      }
    });
    
    return output;
  }

  buildVariables(variables) {
    if (!variables || Object.keys(variables).length === 0) {
      return 'Aucune variable définie';
    }
    
    return Object.keys(variables).map(key => {
      const value = variables[key];
      return `**${key}:** ${typeof value === 'string' && value.startsWith('{{') ? value : `"${value}"`}`;
    }).join('\n');
  }

  buildObjectionHandling(objections) {
    if (!objections) return 'Pas de gestion d\'objections spécifique';
    
    return Object.keys(objections).map(objection => {
      return `**${objection}:** ${objections[objection]}`;
    }).join('\n');
  }

  buildDataCollection(dataCollection) {
    if (!dataCollection) return 'Pas de collecte de données spécifiée';
    
    let output = '';
    
    if (dataCollection.required_fields) {
      output += '**Champs obligatoires:** ' + dataCollection.required_fields.join(', ') + '\n';
    }
    
    if (dataCollection.optional_fields) {
      output += '**Champs optionnels:** ' + dataCollection.optional_fields.join(', ') + '\n';
    }
    
    return output;
  }

  buildWebhooks(webhooks) {
    if (!webhooks) return 'Pas de webhooks configurés';
    
    return Object.keys(webhooks).map(webhookName => {
      const webhook = webhooks[webhookName];
      return `**${webhookName}:** ${webhook.url}\n**Trigger:** ${webhook.trigger}`;
    }).join('\n\n');
  }

  buildEnrichment(enrichment) {
    if (!enrichment?.web_scraping?.enabled) {
      return 'Enrichissement contextuel désactivé';
    }
    
    let output = '**Enrichissement web activé**\n';
    
    if (enrichment.web_scraping.sources) {
      output += 'Sources : ' + enrichment.web_scraping.sources.map(s => s.type).join(', ') + '\n';
    }
    
    return output;
  }
}

module.exports = PromptGeneratorFixed;