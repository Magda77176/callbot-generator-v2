const puppeteer = require('puppeteer');
const axios = require('axios');

class ContextEnricher {
  constructor() {
    this.enrichmentCache = new Map();
  }

  /**
   * Enrichit le contexte d'un template avec des données web
   * @param {Object} template - Template CallBot
   * @param {Object} userInputs - Variables fournies par l'utilisateur
   * @returns {Object} Template enrichi
   */
  async enrichTemplate(template, userInputs) {
    console.log(`🔍 Enrichissement contextuel pour ${template.metadata.template_name}`);
    
    if (!template.context_enrichment?.web_scraping?.enabled) {
      console.log('⏭️ Web scraping désactivé pour ce template');
      return template;
    }

    const enrichedData = {};
    
    // Scraping website principal
    if (userInputs.site_web) {
      enrichedData.website_data = await this.scrapeWebsite(userInputs.site_web);
    }

    // Recherche Google Business
    if (userInputs.nom_entreprise && userInputs.adresse) {
      enrichedData.google_business = await this.searchGoogleBusiness(
        `${userInputs.nom_entreprise} ${userInputs.adresse}`
      );
    }

    // Scraping réseaux sociaux
    if (userInputs.nom_entreprise) {
      enrichedData.social_media = await this.scrapeSocialMedia(userInputs.nom_entreprise);
    }

    // Injection dans le template
    return this.injectEnrichedData(template, enrichedData, userInputs);
  }

  /**
   * Scrape le site web principal
   */
  async scrapeWebsite(url) {
    try {
      const cacheKey = `website_${url}`;
      if (this.enrichmentCache.has(cacheKey)) {
        return this.enrichmentCache.get(cacheKey);
      }

      console.log(`🌐 Scraping ${url}`);
      
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
      
      const scrapedData = await page.evaluate(() => {
        // Extract services/menu
        const services = Array.from(document.querySelectorAll(
          'h2, h3, .service, .menu-item, [data-service]'
        )).map(el => el.textContent.trim()).filter(text => text.length > 0);

        // Extract horaires
        const horaires = Array.from(document.querySelectorAll(
          '[class*="hour"], [class*="horaire"], [data-hours]'
        )).map(el => el.textContent.trim());

        // Extract contact info
        const phones = Array.from(document.querySelectorAll(
          '[href^="tel:"], [class*="phone"], [class*="telephone"]'
        )).map(el => el.textContent.trim());

        // Extract description/about
        const descriptions = Array.from(document.querySelectorAll(
          '[class*="about"], [class*="description"], .intro, .presentation'
        )).map(el => el.textContent.trim());

        return {
          services: services.slice(0, 10), // Limite pour éviter le spam
          horaires: horaires.slice(0, 5),
          phones: phones.slice(0, 3),
          descriptions: descriptions.slice(0, 3),
          title: document.title,
          meta_description: document.querySelector('meta[name="description"]')?.content
        };
      });

      await browser.close();
      
      this.enrichmentCache.set(cacheKey, scrapedData);
      return scrapedData;

    } catch (error) {
      console.log(`⚠️ Erreur scraping ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Recherche Google Business (simulation)
   */
  async searchGoogleBusiness(query) {
    try {
      console.log(`🏢 Recherche Google Business: ${query}`);
      
      // Simulation - en production, utiliser Google Places API
      return {
        avis_count: Math.floor(Math.random() * 100) + 10,
        note_moyenne: (Math.random() * 2 + 3).toFixed(1), // 3-5
        horaires_google: "Lun-Ven 9h-18h, Sam 9h-17h",
        categories: ["Restaurant", "Café"],
        derniers_avis: [
          "Service rapide et accueillant",
          "Très bon rapport qualité-prix",
          "Je recommande vivement"
        ]
      };
    } catch (error) {
      console.log(`⚠️ Erreur Google Business:`, error.message);
      return null;
    }
  }

  /**
   * Scraping réseaux sociaux (simulation)
   */
  async scrapeSocialMedia(businessName) {
    try {
      console.log(`📱 Recherche réseaux sociaux: ${businessName}`);
      
      // Simulation - en production, utiliser APIs Facebook/Instagram
      return {
        instagram: {
          followers: Math.floor(Math.random() * 5000) + 100,
          derniers_posts: [
            "Nouveau plat de la semaine !",
            "Merci à tous nos clients fidèles",
            "Réservations ouvertes pour le weekend"
          ],
          hashtags: ["#restaurant", "#cuisine", "#local"]
        },
        facebook: {
          likes: Math.floor(Math.random() * 2000) + 50,
          derniers_events: [
            "Soirée musicale vendredi",
            "Menu spécial Saint-Valentin"
          ]
        }
      };
    } catch (error) {
      console.log(`⚠️ Erreur réseaux sociaux:`, error.message);
      return null;
    }
  }

  /**
   * Injecte les données enrichies dans le template
   */
  injectEnrichedData(template, enrichedData, userInputs) {
    const enrichedTemplate = JSON.parse(JSON.stringify(template));
    
    // Enrichissement des spécialités depuis le site web
    if (enrichedData.website_data?.services?.length > 0) {
      const detectedServices = enrichedData.website_data.services.join(', ');
      enrichedTemplate.bot_config.context_variables.specialites_detectees = detectedServices;
    }

    // Enrichissement de la description depuis le site
    if (enrichedData.website_data?.descriptions?.length > 0) {
      enrichedTemplate.bot_config.context_variables.description_site = 
        enrichedData.website_data.descriptions[0];
    }

    // Enrichissement social proof
    if (enrichedData.google_business) {
      enrichedTemplate.bot_config.context_variables.avis_google = 
        `${enrichedData.google_business.note_moyenne}/5 (${enrichedData.google_business.avis_count} avis)`;
    }

    // Enrichissement des horaires détectées
    if (enrichedData.website_data?.horaires?.length > 0) {
      enrichedTemplate.bot_config.context_variables.horaires_detectees = 
        enrichedData.website_data.horaires.join(' | ');
    }

    // Ajout d'une section "contexte enrichi" dans les flows
    enrichedTemplate.conversation_flows.contexte_enrichi = {
      "trigger_keywords": ["à propos", "qui êtes-vous", "votre restaurant"],
      "response": this.generateEnrichedResponse(enrichedData, userInputs)
    };

    // Log de l'enrichissement
    console.log(`✅ Template enrichi avec ${Object.keys(enrichedData).length} sources`);
    
    return enrichedTemplate;
  }

  /**
   * Génère une réponse enrichie avec le contexte web
   */
  generateEnrichedResponse(enrichedData, userInputs) {
    let response = `Chez {{${userInputs.nom_entreprise || 'notre établissement'}}}`;
    
    if (enrichedData.website_data?.descriptions?.length > 0) {
      response += `, ${enrichedData.website_data.descriptions[0]}`;
    }

    if (enrichedData.google_business?.note_moyenne) {
      response += ` Nos clients nous donnent ${enrichedData.google_business.note_moyenne}/5 sur Google.`;
    }

    if (enrichedData.website_data?.services?.length > 0) {
      response += ` Nos spécialités incluent : ${enrichedData.website_data.services.slice(0, 3).join(', ')}.`;
    }

    response += ` N'hésitez pas à consulter notre site {{site_web}} pour plus d'informations !`;

    return response;
  }

  /**
   * Clear le cache d'enrichissement
   */
  clearCache() {
    this.enrichmentCache.clear();
    console.log('🧹 Cache d\'enrichissement vidé');
  }
}

module.exports = ContextEnricher;