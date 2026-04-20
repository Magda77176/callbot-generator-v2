/**
 * Flow Engine - Gère les flux conversationnels basés sur templates
 * Inspiré de la logique de Mindy mais modulaire
 */

class FlowEngine {
  constructor(template) {
    this.template = template;
    this.currentStep = 0;
    this.collectedData = {};
    this.stepNames = template.flow.steps;
    this.timeouts = template.flow.timeoutPerStep || [];
  }

  getCurrentStep() {
    return this.stepNames[this.currentStep];
  }

  getStepTimeout() {
    return this.timeouts[this.currentStep] || 30;
  }

  canProceedToNextStep() {
    const currentStepName = this.getCurrentStep();
    
    switch(currentStepName) {
      case 'accueil':
        return true; // Toujours passer après accueil
        
      case 'triage':
        // Si urgence détectée, arrêter le flow
        return !this.collectedData.isEmergency;
        
      case 'qualification':
        // Pour immobilier, vérifier si prospect qualifié
        return this.collectedData.qualified !== false;
        
      case 'besoin':
      case 'probleme':
        // Service/problème identifié
        return this.collectedData.serviceSelected;
        
      case 'collecte':
      case 'identification':
        // Toutes les infos requises collectées
        return this.validateRequiredFields();
        
      case 'resolution':
        // Pour SAV, vérifier si résolu
        return this.collectedData.resolutionProvided;
        
      case 'confirmation':
        // Confirmation reçue
        return this.collectedData.confirmed;
        
      default:
        return true;
    }
  }

  validateRequiredFields() {
    const required = this.template.required_fields || [];
    
    for (let field of required) {
      if (!this.collectedData[field.name]) {
        return false;
      }
    }
    
    return true;
  }

  nextStep() {
    if (this.currentStep < this.stepNames.length - 1) {
      this.currentStep++;
      return true;
    }
    return false; // Flow terminé
  }

  setData(key, value) {
    this.collectedData[key] = value;
  }

  getData(key) {
    return this.collectedData[key];
  }

  getAllData() {
    return { ...this.collectedData };
  }

  // Validation spécifique de Mindy pour dates/heures
  validateTemporal(dateStr, timeStr) {
    const now = new Date();
    const proposed = new Date(`${dateStr} ${timeStr}`);
    
    if (proposed <= now) {
      return {
        valid: false,
        error: "Cette date/heure est dans le passé. Proposez une date future."
      };
    }
    
    return {
      valid: true,
      formatted: proposed.toISOString()
    };
  }

  // Détection d'urgence (pour secteur médical/dentaire)
  detectEmergency(userMessage) {
    if (!this.template.emergency?.enabled) {
      return false;
    }
    
    const keywords = this.template.emergency.keywords || [];
    const message = userMessage.toLowerCase();
    
    for (let keyword of keywords) {
      if (message.includes(keyword.toLowerCase())) {
        this.setData('isEmergency', true);
        this.setData('emergencyKeyword', keyword);
        return true;
      }
    }
    
    return false;
  }

  // Génère la réponse selon l'étape actuelle
  generateStepResponse(userInput = '') {
    const step = this.getCurrentStep();
    const bot = this.template.bot;
    
    switch(step) {
      case 'accueil':
        return bot.greeting;
        
      case 'triage':
        if (this.detectEmergency(userInput)) {
          return this.template.emergency.message;
        }
        return "Y a-t-il une urgence ou un problème grave ?";
        
      case 'qualification':
        const questions = this.template.qualifying_questions || [];
        return questions[0] || "Pouvez-vous me décrire votre projet ?";
        
      case 'besoin':
        return this.generateServicesResponse();
        
      case 'probleme':
        return this.generateProblemTypesResponse();
        
      case 'collecte':
      case 'identification':
        return this.generateFieldQuestion();
        
      case 'confirmation':
        return this.generateConfirmation();
        
      default:
        return "Comment puis-je vous aider ?";
    }
  }

  generateServicesResponse() {
    const services = this.template.services || [];
    let response = "Voici nos services disponibles:\\n\\n";
    
    services.forEach((service, index) => {
      const price = service.price > 0 ? `${service.price}€` : 'Gratuit';
      response += `${index + 1}. ${service.name} — ${price} (${service.duration} min)\\n`;
    });
    
    response += "\\nQuel service vous intéresse ?";
    return response;
  }

  generateProblemTypesResponse() {
    const problems = this.template.problem_types || [];
    let response = "Quel type de problème rencontrez-vous ?\\n\\n";
    
    problems.forEach((problem, index) => {
      response += `${index + 1}. ${problem}\\n`;
    });
    
    return response;
  }

  generateFieldQuestion() {
    const required = this.template.required_fields || [];
    
    for (let field of required) {
      if (!this.collectedData[field.name]) {
        return field.question;
      }
    }
    
    return "J'ai toutes les informations nécessaires.";
  }

  generateConfirmation() {
    const template = this.template.conversation?.confirmation_template || 
      "Récapitulatif: {{firstName}} {{lastName}}. Confirmez-vous ?";
    
    // Simple template replacement
    let confirmation = template;
    Object.keys(this.collectedData).forEach(key => {
      const placeholder = `{{${key}}}`;
      confirmation = confirmation.replace(placeholder, this.collectedData[key] || '');
    });
    
    return confirmation;
  }

  isComplete() {
    return this.currentStep >= this.stepNames.length - 1 && 
           this.collectedData.confirmed;
  }
}

module.exports = FlowEngine;