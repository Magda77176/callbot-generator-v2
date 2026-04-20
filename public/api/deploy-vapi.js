/**
 * API Serverless pour déployer sur Vapi (Vercel)
 */

const fs = require('fs');
const path = require('path');

// Configuration CallBots
const CALLBOT_CONFIGS = {
  restaurant: {
    name: 'Marco',
    greeting: 'Bonjour ! Je suis Marco, l\'assistant de {{business_name}}. Je peux vous aider pour une réservation, une commande à emporter ou vous renseigner sur notre carte. Comment puis-je vous aider ?',
    sector: 'restaurant'
  },
  coiffeur: {
    name: 'Léa',
    greeting: 'Bonjour ! Je suis Léa de {{business_name}}. Je peux prendre rendez-vous pour une coupe, couleur, ou soins capillaires. À quelle date souhaitez-vous venir ?',
    sector: 'coiffeur'
  },
  dentaire: {
    name: 'Tom',
    greeting: 'Bonjour, ici Tom du cabinet {{business_name}}. Je peux vous aider à prendre rendez-vous pour une consultation, urgence dentaire, ou vous renseigner sur nos soins. Que puis-je faire pour vous ?',
    sector: 'dentaire'
  },
  immobilier: {
    name: 'Alex',
    greeting: 'Bonjour ! Je suis Alex de l\'agence {{business_name}}. Je m\'occupe des visites et renseignements immobiliers. Vous cherchez à acheter, vendre, ou louer ?',
    sector: 'immobilier'
  },
  ecommerce: {
    name: 'Sophie',
    greeting: 'Bonjour ! Je suis Sophie, assistante {{business_name}}. Je peux vous aider pour vos commandes, livraisons, retours, ou questions produits. Comment puis-je vous assister ?',
    sector: 'ecommerce'
  }
};

async function deployToVapi(config, businessInfo) {
  const systemPrompt = buildPersonalizedPrompt(config, businessInfo);
  
  const payload = {
    name: config.name,
    firstMessage: config.greeting.replace(/{{business_name}}/g, businessInfo.name || 'notre établissement'),
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.3,
      maxTokens: 150,
      systemPrompt: systemPrompt
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
    serverUrl: config.webhookUrl,
    serverUrlSecret: config.webhookSecret
  };

  const response = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.vapiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vapi API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

function buildPersonalizedPrompt(config, business) {
  // Charge le prompt de base depuis les fichiers générés
  const promptPath = path.join(__dirname, '..', 'generated-mindy', `callbot-${config.sector}`, 'system-prompt.txt');
  let basePrompt = '';
  
  try {
    basePrompt = fs.readFileSync(promptPath, 'utf8');
  } catch (error) {
    // Fallback prompt basique
    basePrompt = `Tu es ${config.name}, assistant virtuel spécialisé en ${config.sector}.`;
  }

  // Injection des infos business
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

## INSTRUCTIONS SPÉCIALES
- TOUJOURS mentionner les horaires si demandés
- Rediriger vers Google My Business pour avis/photos : "${business.gmb_url || 'notre fiche Google'}"
- Mentionner le site web pour plus d'infos : "${business.website || 'notre site'}"
- Si demande réseaux sociaux, donner Facebook/Instagram
`;

  return basePrompt + businessInfo;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sector, vapiKey, webhookUrl, webhookSecret, businessInfo } = req.body;

    if (!CALLBOT_CONFIGS[sector]) {
      return res.status(400).json({ error: `Secteur ${sector} non supporté` });
    }

    if (!vapiKey || !webhookUrl) {
      return res.status(400).json({ error: 'Clé Vapi et URL webhook requis' });
    }

    const config = {
      ...CALLBOT_CONFIGS[sector],
      vapiKey,
      webhookUrl,
      webhookSecret: webhookSecret || 'default-secret'
    };

    console.log(`Déploiement CallBot ${sector} avec business:`, businessInfo?.name);

    const result = await deployToVapi(config, businessInfo || {});

    return res.status(200).json({
      success: true,
      assistantId: result.id,
      phoneNumber: result.phoneNumber, // Si Vapi renvoie ça
      sector: sector,
      config: config.name
    });

  } catch (error) {
    console.error('Erreur déploiement Vapi:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}