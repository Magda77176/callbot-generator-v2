#!/usr/bin/env node

/**
 * Générateur de configurations Vapi pour les CallBots
 * Convertit nos system prompts en assistants Vapi
 */

const fs = require('fs-extra');
const path = require('path');

class VapiConfigGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, 'templates');
    this.outputDir = path.join(__dirname, 'vapi-configs');
  }

  async generateAll() {
    console.log('🎙️ Génération des configurations Vapi...\n');
    
    await fs.ensureDir(this.outputDir);
    
    const templates = await this.loadTemplates();
    const vapiConfigs = [];

    for (const template of templates) {
      const config = await this.generateVapiConfig(template);
      vapiConfigs.push(config);
      
      // Sauvegarder config individuelle
      const filename = `${template.id}-vapi-config.json`;
      await fs.writeFile(
        path.join(this.outputDir, filename),
        JSON.stringify(config, null, 2)
      );
      
      console.log(`✅ ${config.name} → ${filename}`);
    }

    // Sauvegarder config globale
    await fs.writeFile(
      path.join(this.outputDir, 'all-vapi-configs.json'),
      JSON.stringify(vapiConfigs, null, 2)
    );

    console.log(`\n🎉 ${vapiConfigs.length} configurations Vapi générées dans ${this.outputDir}/`);
    console.log('\n📋 Prochaines étapes :');
    console.log('1. Créer un compte sur https://vapi.ai');
    console.log('2. Obtenir une clé API publique');
    console.log('3. Créer les assistants via l\'API Vapi ou le Dashboard');
    console.log('4. Récupérer les IDs d\'assistants générés');
    console.log('5. Les mettre dans voice.tsx');
  }

  async loadTemplates() {
    const templates = [];
    const files = await fs.readdir(this.templatesDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const templatePath = path.join(this.templatesDir, file);
        const template = await fs.readJSON(templatePath);
        template.id = path.basename(file, '.json');
        templates.push(template);
      }
    }
    
    return templates;
  }

  async generateVapiConfig(template) {
    const systemPrompt = this.buildSystemPrompt(template);
    
    return {
      name: `${template.bot.name} (${template.name})`,
      firstMessage: template.bot.greeting,
      voice: {
        provider: 'elevenlabs',
        voiceId: this.selectVoice(template.bot.name),
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0.5
      },
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        maxTokens: 1000,
        temperature: 0.7,
        systemMessage: systemPrompt
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'fr',
        smart_format: true
      },
      recordingEnabled: false,
      endCallMessage: 'Merci pour votre appel. À bientôt !',
      endCallPhrases: ['au revoir', 'raccrocher', 'fin de l\'appel'],
      backgroundSound: 'off',
      backchannelingEnabled: true,
      voicemailDetection: {
        enabled: true,
        machineDetectionTimeout: 3000
      },
      silenceTimeoutSeconds: 15,
      maxDurationSeconds: 600, // 10 minutes max
      metadata: {
        template_id: template.id,
        category: template.category || 'general',
        generated_at: new Date().toISOString()
      }
    };
  }

  buildSystemPrompt(template) {
    const conversation = template.conversation || {};
    const bot = template.bot_config || {};
    const flows = template.conversation_flows || {};
    
    return `# SYSTEM PROMPT: ${conversation.name || bot.name} — ${template.metadata?.name || 'CallBot'}

## IDENTITÉ & PERSONNALITÉ
**Nom:** ${context.bot.name}
**Rôle:** ${context.bot.role}
**Personnalité:** ${context.bot.tone}

## MISSION PRINCIPALE
${template.description}

## FLUX OBLIGATOIRE
Tu dois TOUJOURS suivre ce flux EXACT:
${context.flow.steps.map((step, i) => `${i + 1}. ${step.toUpperCase()}`).join(' → ')}

${context.services.length > 0 ? `
## SERVICES DISPONIBLES
${context.services.map((service, i) => {
  const price = service.price > 0 ? `${service.price}€` : 'Gratuit';
  return `${i + 1}. ${service.name} — ${price} (${service.duration} min)`;
}).join('\n')}
` : ''}

${context.emergency?.enabled ? `
## URGENCES
**Mots-clés d'urgence:** ${context.emergency.keywords.join(', ')}
**Action:** ${context.emergency.action}
**Message:** "${context.emergency.message}"
` : ''}

## RÈGLES STRICTES
- JAMAIS d'inventions ou d'approximations
- Demande TOUJOURS les infos manquantes
- Confirme CHAQUE détail avant validation
- Reste dans ton rôle de ${context.bot.name}
- Français naturel et professionnel
- Maximum 50 mots par réponse (appel vocal)

## INFORMATIONS BUSINESS
${Object.entries(context.business).map(([key, value]) => `**${key}:** ${value}`).join('\n')}

Tu es maintenant ${context.bot.name}. Réponds UNIQUEMENT dans ce rôle.`;
  }

  selectVoice(botName) {
    const voices = {
      'Tom': 'pNInz6obpgDQGcFmaJgB', // Voix masculine professionnelle
      'Sophie': 'EXAVITQu4vr4xnSDxMaL', // Voix féminine douce
      'Alex': 'VR6AewLTigWG4xSOukaG', // Voix unisexe jeune
      'Marco': 'onwK4e9ZLuTAKqWW03F9', // Voix masculine chaleureuse
      'Léa': 'ThT5KcBeYPX3keUQqHPh'  // Voix féminine stylée
    };
    
    return voices[botName] || 'pNInz6obpgDQGcFmaJgB'; // Défaut : voix masculine
  }
}

// Exécution
if (require.main === module) {
  const generator = new VapiConfigGenerator();
  generator.generateAll().catch(console.error);
}

module.exports = VapiConfigGenerator;