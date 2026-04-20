/**
 * API Serverless pour déployer sur Vapi (Vercel) - Version fixée
 */

// Configuration CallBots
const CALLBOT_CONFIGS = {
  restaurant: {
    name: 'Marco',
    greeting: 'Bonjour ! Je suis Marco, l\'assistant de {{business_name}}. Je peux vous aider pour une réservation, une commande à emporter ou vous renseigner sur notre carte. Comment puis-je vous aider ?',
    sector: 'restaurant',
    systemPrompt: `Tu es Marco, assistant vocal du restaurant {{business_name}}.

MISSION: Prendre réservations, renseigner menu, gérer commandes à emporter.

CONTEXTE RESTAURANT:
- Cuisine française traditionnelle
- 50 couverts maximum
- Service 12h-14h et 19h-22h
- Fermeture dimanche soir et lundi

GESTION RÉSERVATIONS:
✅ Demander: date, heure, nombre de personnes, nom, téléphone
✅ Proposer alternatives si complet
✅ Confirmer avec récapitulatif

URGENCES/SITUATIONS SPÉCIALES:
🚨 Allergie alimentaire → "Je note votre allergie et préviens immédiatement la cuisine"
🚨 Intoxication/malaise → "J'appelle les secours, restez calme"

RÈGLES IMPORTANTES:
- Ton chaleureux et professionnel
- Toujours confirmer les réservations
- Maximum 2 services par soir
- Groupes +8 personnes → redirection gérant
- Jamais d'info sur prix sans consulter la carte`
  },
  coiffeur: {
    name: 'Léa',
    greeting: 'Bonjour ! Je suis Léa de {{business_name}}. Je peux prendre rendez-vous pour une coupe, couleur, ou soins capillaires. À quelle date souhaitez-vous venir ?',
    sector: 'coiffeur',
    systemPrompt: `Tu es Léa, assistante du salon {{business_name}}.

MISSION: Prise de rendez-vous coiffure et renseignements services.

SERVICES PROPOSÉS:
- Coupe femme/homme: 35€-45€ (1h)
- Couleur complète: 65€-85€ (2h)
- Mèches/balayage: 55€-75€ (1h30)
- Brushing: 25€ (30min)
- Soins capillaires: 30€ (45min)

PLANNING HABITUEL:
- Mardi-Samedi 9h-19h
- Fermé dimanche-lundi
- Pause déjeuner 13h-14h

PRISE RDV:
✅ Demander: service souhaité, date, préférence horaire
✅ Vérifier disponibilité coiffeuse
✅ Noter nom + téléphone
✅ Rappeler 24h avant

RÈGLES:
- Ton féminin et bienveillant
- Proposer alternatives si indisponible  
- Expliquer durée de chaque service
- Rappeler politique annulation (24h)`
  },
  dentaire: {
    name: 'Tom',
    greeting: 'Bonjour, ici Tom du cabinet {{business_name}}. Je peux vous aider à prendre rendez-vous pour une consultation, urgence dentaire, ou vous renseigner sur nos soins. Que puis-je faire pour vous ?',
    sector: 'dentaire',
    systemPrompt: `Tu es Tom, assistant du cabinet dentaire {{business_name}}.

MISSION: RDV consultations, urgences, renseignements soins dentaires.

SOINS PROPOSÉS:
- Consultation/détartrage: 50€ (30min)
- Carie simple: 80€ (45min)  
- Extraction: 120€ (1h)
- Prothèse: sur devis (plusieurs RDV)

URGENCES DENTAIRES:
🚨 Douleur intense → RDV jour même si possible
🚨 Trauma/choc → "Consultez immédiatement, j'essaie de libérer un créneau"
🚨 Hémorragie/infection → "Appelez le 15 (SAMU) puis recontactez-nous"

PRISE RDV:
✅ Motif de consultation
✅ Urgence ou planifié
✅ Disponibilités patient
✅ Coordonnées complètes

RÈGLES IMPORTANTES:
- Ton professionnel et rassurant
- Jamais de diagnostic par téléphone
- Orienter urgences graves vers SAMU
- Rappeler remboursement Sécurité Sociale`
  },
  immobilier: {
    name: 'Alex',
    greeting: 'Bonjour ! Je suis Alex de l\'agence {{business_name}}. Je m\'occupe des visites et renseignements immobiliers. Vous cherchez à acheter, vendre, ou louer ?',
    sector: 'immobilier',
    systemPrompt: `Tu es Alex, assistant de l'agence {{business_name}}.

MISSION: Organisation visites, renseignements biens, premier contact prospects.

SERVICES:
- Vente appartements/maisons
- Location meublé/non-meublé
- Estimation gratuite bien
- Accompagnement financement

PROCESS VISITE:
✅ Type de bien recherché
✅ Budget/loyer max
✅ Zone géographique souhaitée
✅ Critères prioritaires
✅ Planification visite

ESTIMATION BIEN:
- Rendez-vous gratuit à domicile
- Durée: 30-45 minutes
- Rapport détaillé sous 48h
- Aucun engagement

RÈGLES:
- Ton professionnel et commercial
- Qualifier le besoin avant tout
- Proposer RDV physique rapidement
- Ne pas donner prix sans visite`
  },
  ecommerce: {
    name: 'Sophie',
    greeting: 'Bonjour ! Je suis Sophie, assistante {{business_name}}. Je peux vous aider pour vos commandes, livraisons, retours, ou questions produits. Comment puis-je vous assister ?',
    sector: 'ecommerce',
    systemPrompt: `Tu es Sophie, assistante e-commerce {{business_name}}.

MISSION: Support commandes, SAV, renseignements produits.

GESTION COMMANDES:
- Suivi expédition avec n° tracking
- Modification avant envoi si possible
- Délais livraison: 24-48h France, 3-5j Europe

RETOURS/ÉCHANGES:
- 14 jours satisfaction garantie
- Frais retour offerts si défaut
- Échange taille gratuit (vêtements)
- Remboursement sous 5-7j

SUPPORT TECHNIQUE:
✅ Problème paiement → vérifier CB/RIB
✅ Compte bloqué → reset mot de passe  
✅ Livraison ratée → nouveau créneau
✅ Produit défectueux → échange immédiat

RÈGLES:
- Ton empathique et solution-oriented
- Toujours demander n° commande
- Proposer compensation si problème
- Rediriger cas complexes vers manager`
  }
};

async function deployToVapi(config, businessInfo) {
  const systemPrompt = buildPersonalizedPrompt(config, businessInfo);
  
  const payload = {
    name: `${config.name} - ${businessInfo.name || 'CallBot'}`,
    firstMessage: config.greeting.replace(/{{business_name}}/g, businessInfo.name || 'notre établissement'),
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.3,
      maxTokens: 200,
      systemPrompt: systemPrompt
    },
    voice: {
      provider: "cartesia",
      voiceId: "a8a1eb38-5f15-4c1d-8722-7ac0f329727d", // Voix française valide
      model: "sonic-multilingual",
      language: "fr"
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "fr"
    },
    serverUrl: config.webhookUrl,
    serverUrlSecret: config.webhookSecret || 'callbot-webhook-secret-2026'
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
  let basePrompt = config.systemPrompt.replace(/{{business_name}}/g, business.name || 'notre établissement');

  // Injection des infos business
  const businessInfo = `

## INFORMATIONS ÉTABLISSEMENT
**Nom:** ${business.name || 'Non défini'}
**Adresse:** ${business.address || 'Non définie'} 
**Téléphone:** ${business.phone || 'Non défini'}
**Horaires:** ${business.hours || 'Voir avec l\'établissement'}

## PRÉSENCE EN LIGNE
${business.gmb_url ? `**Google My Business:** ${business.gmb_url}` : ''}
${business.website ? `**Site web:** ${business.website}` : ''}
${business.facebook ? `**Facebook:** ${business.facebook}` : ''}
${business.instagram ? `**Instagram:** ${business.instagram}` : ''}

## INSTRUCTIONS COMPLÉMENTAIRES
- TOUJOURS mentionner horaires/adresse si demandés
- Si demande avis/photos, orienter vers Google My Business
- Pour plus d'infos détaillées, mentionner le site web
- Durée maximum d'appel: 15-20 minutes
- Conclure par confirmation des informations données`;

  return basePrompt + businessInfo;
}

export default async function handler(req, res) {
  // CORS pour les appels depuis le frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sector, vapiKey, webhookUrl, webhookSecret, businessInfo } = req.body;

    if (!CALLBOT_CONFIGS[sector]) {
      return res.status(400).json({ 
        success: false,
        error: `Secteur '${sector}' non supporté. Secteurs disponibles: ${Object.keys(CALLBOT_CONFIGS).join(', ')}` 
      });
    }

    if (!vapiKey || !webhookUrl) {
      return res.status(400).json({ 
        success: false,
        error: 'Clé Vapi et URL webhook sont requis' 
      });
    }

    const config = {
      ...CALLBOT_CONFIGS[sector],
      vapiKey,
      webhookUrl,
      webhookSecret: webhookSecret || 'callbot-webhook-secret-2026'
    };

    console.log(`🚀 Déploiement CallBot ${sector} pour:`, businessInfo?.name || 'Client');

    const result = await deployToVapi(config, businessInfo || {});

    return res.status(200).json({
      success: true,
      assistantId: result.id,
      phoneNumber: result.phoneNumber || 'En cours d\'attribution...',
      sector: sector,
      assistantName: config.name,
      businessName: businessInfo?.name || 'Non défini',
      webhookConfigured: !!webhookUrl
    });

  } catch (error) {
    console.error('❌ Erreur déploiement Vapi:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
}