#!/usr/bin/env node

/**
 * Déployement réel sur Vapi + Personnalisation GMB/réseaux
 */

class VapiDeployer {
  constructor(privateKey) {
    this.privateKey = privateKey;
    this.baseUrl = 'https://api.vapi.ai';
  }

  async createAssistant(callbotConfig, businessInfo) {
    const payload = {
      name: callbotConfig.name,
      firstMessage: callbotConfig.greeting,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        temperature: 0.3,
        maxTokens: 150,
        systemPrompt: this.buildPersonalizedPrompt(callbotConfig, businessInfo)
      },
      voice: {
        provider: "cartesia",
        voiceId: "79a125e8-cd45-4c13-8a67-188112f4dd22",
        model: "sonic-multilingual",
        language: "fr-FR"
      },
      transcriber: {
        provider: "google",
        language: "fr-FR"
      },
      serverUrl: callbotConfig.webhookUrl,
      serverUrlSecret: callbotConfig.webhookSecret
    };

    try {
      const response = await fetch(`${this.baseUrl}/assistant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.privateKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Vapi API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur déploiement Vapi:', error);
      throw error;
    }
  }

  buildPersonalizedPrompt(callbot, business) {
    let prompt = callbot.systemPrompt || '';

    // Injection des infos business
    if (business.name) {
      prompt = prompt.replace(/{{restaurant_name}}/g, business.name);
      prompt = prompt.replace(/{{business_name}}/g, business.name);
    }

    // Ajout section GMB et réseaux sociaux
    const businessInfo = `
## INFORMATIONS ÉTABLISSEMENT
**Nom:** ${business.name || 'Non défini'}
**Adresse:** ${business.address || 'Non définie'}
**Téléphone:** ${business.phone || 'Non défini'}
**Horaires:** ${business.hours || 'Lun-Ven 9h-18h'}

## PRÉSENCE EN LIGNE
**Google My Business:** ${business.gmb_url || 'Non configuré'}
**Site web:** ${business.website || 'Non configuré'}
**Facebook:** ${business.facebook || 'Non configuré'}
**Instagram:** ${business.instagram || 'Non configuré'}
**TripAdvisor:** ${business.tripadvisor || 'Non configuré'}

## INSTRUCTIONS SPÉCIALES
- TOUJOURS mentionner les horaires si demandés
- Rediriger vers Google My Business pour avis/photos : "${business.gmb_url || 'notre fiche Google'}"
- Mentionner le site web pour plus d'infos : "${business.website || 'notre site'}"
- Si demande réseaux sociaux, donner Facebook/Instagram
`;

    return prompt + businessInfo;
  }

  // Génère le formulaire de personnalisation
  static generateCustomizationForm() {
    return `
<div class="bg-gray-50 rounded-lg p-6 mt-6">
  <h4 class="text-lg font-semibold text-gray-800 mb-4">📍 Personnalisation établissement</h4>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Nom établissement</label>
      <input type="text" id="business-name" placeholder="Restaurant La Bella Vita" 
             class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
      <input type="text" id="business-address" placeholder="123 Rue de la Paix, Paris" 
             class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
      <input type="tel" id="business-phone" placeholder="01 23 45 67 89" 
             class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Horaires</label>
      <input type="text" id="business-hours" placeholder="Lun-Sam 12h-22h, Dim fermé" 
             class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">URL Google My Business</label>
      <input type="url" id="business-gmb" placeholder="https://maps.app.goo.gl/..." 
             class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Site web</label>
      <input type="url" id="business-website" placeholder="https://www.restaurant.fr" 
             class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
      <input type="url" id="business-facebook" placeholder="https://facebook.com/restaurant" 
             class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
      <input type="url" id="business-instagram" placeholder="https://instagram.com/restaurant" 
             class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
    </div>
  </div>
  
  <div class="mt-4 text-sm text-gray-600">
    <p><strong>💡 Ces informations</strong> seront intégrées dans le prompt du CallBot pour des réponses personnalisées.</p>
  </div>
</div>`;
  }
}

module.exports = VapiDeployer;