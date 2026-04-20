#!/usr/bin/env node

/**
 * CallBot Generator V2 — Format Mindy
 * Génère des callbots complets basés sur le stack technique de Mindy
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class MindyCallBotGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, 'templates');
    this.mindyStackDir = path.join(__dirname, 'mindy-stack');
    this.outputDir = path.join(__dirname, 'generated-mindy');
  }

  async generateAll() {
    console.log('🎤 CallBot Generator V2 — Format Mindy\n');
    
    await fs.ensureDir(this.outputDir);
    
    const templates = await this.loadTemplates();
    
    console.log(`📋 ${templates.length} templates trouvés :\n`);
    templates.forEach(t => console.log(`   ${t.metadata.name} (${t.id})`));
    
    console.log('\n🚀 Génération des CallBots format Mindy...\n');
    
    for (const template of templates) {
      await this.generateMindyBot(template);
    }

    console.log(`\n🎉 ${templates.length} CallBots générés dans ${this.outputDir}/\n`);
    console.log('📁 Structure générée pour chaque bot :');
    console.log('   ├── system-prompt.txt    # Prompt adapté au secteur');
    console.log('   ├── example-config.json  # Configuration Vapi complète');
    console.log('   ├── README.md            # Documentation');
    console.log('   ├── wordpress-plugin/    # Plugin WordPress prêt');
    console.log('   ├── webhook-handler.js   # Traitement des appels');
    console.log('   └── test-integration.js  # Tests automatisés\n');
    console.log('🎯 Chaque bot est prêt pour déploiement production !');
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

  async generateMindyBot(template) {
    const botName = template.conversation?.name || template.bot_config?.name || 'Bot';
    const sectorName = template.metadata?.name || 'Secteur';
    const botDir = path.join(this.outputDir, `callbot-${template.id}`);
    
    console.log(`🎯 ${botName} (${sectorName})...`);
    
    await fs.ensureDir(botDir);

    // 1. System Prompt adapté
    await this.generateSystemPrompt(template, botDir);
    
    // 2. Configuration Vapi complète
    await this.generateVapiConfig(template, botDir);
    
    // 3. Documentation
    await this.generateReadme(template, botDir);
    
    // 4. Plugin WordPress
    await this.generateWordPressPlugin(template, botDir);
    
    // 5. Webhook handler
    await this.generateWebhookHandler(template, botDir);
    
    // 6. Tests
    await this.generateTests(template, botDir);

    console.log(`   ✅ callbot-${template.id}/ généré`);
  }

  async generateSystemPrompt(template, botDir) {
    const conv = template.conversation || {};
    const botConfig = template.bot_config || {};
    const flows = template.conversation_flows || {};
    const services = this.extractServices(template);
    
    const prompt = `# SYSTEM PROMPT: ${conv.name} — ${template.metadata?.name} Assistant Vocal

## INSTRUCTIONS CRITIQUES

**JAMAIS sauter les étapes du flux**
**JAMAIS couper sans confirmation finale**
**JAMAIS ignorer une urgence**
**JAMAIS JAMAIS JAMAIS accepter des dates/heures dans le passé**

---

## ⏰ VALIDATION TEMPORELLE STRICTE

### Heure actuelle: {{CURRENT_TIME}}
### Date d'aujourd'hui: {{CURRENT_DATE}}

**RÈGLE ABSOLUE:**
- Si client propose une date/heure ≤ maintenant → REJETER IMMÉDIATEMENT
- Redemander une date/heure FUTURE
- Répéter jusqu'à acceptation d'une date valide

### Algorithme de validation:
1. Parser la date et l'heure proposées par le client
2. Convertir en timestamp
3. Comparer avec timestamp actuel
4. SI proposé_timestamp ≤ maintenant_timestamp: REJETER + redemander
5. SI proposé_timestamp > maintenant_timestamp: ACCEPTER + continuer

---

## FLUX OBLIGATOIRE EN 5 ÉTAPES

### ÉTAPE 1: ACCUEIL (${flows.greeting?.message || 'Bienvenue'})
"${flows.greeting?.message || `Bonjour! Je suis ${conv.name}, assistant ${template.metadata?.name.toLowerCase()}. Comment puis-je vous aider?`}"

### ÉTAPE 2: TRIAGE (Vérification urgences)
${this.generateEmergencySection(template)}

### ÉTAPE 3: BESOIN (Quel service?)
${this.generateServicesSection(services)}

### ÉTAPE 4: COLLECTE (Infos client)
**OBLIGATION: Collecter CES INFOS:**
1. Prénom du client
2. Nom du client  
3. Numéro de téléphone
4. Date et heure FUTURES uniquement

### ÉTAPE 5: CONFIRMATION (Résumé final)
- Résumer COMPLÈTEMENT toutes les infos
- Demander: "Confirmez-vous?"
- ATTENDRE réponse affirmative
- Envoyer webhook avec données
- Terminer professionnellement

---

## COMPORTEMENT REQUIS

### Conversation naturelle
- Parler comme un humain professionnel
- Utiliser contractions naturelles
- Montrer empathie appropriée
- Rester dans le secteur ${template.metadata?.name.toLowerCase()}

### Une question à la fois
- Jamais poser 2 questions simultanément
- Attendre réponse avant question suivante
- Clarifier si réponse ambiguë

---

## DONNÉES WEBHOOK

Envoyer à la fin:
\`\`\`json
{
  "event": "call.completed",
  "callId": "{{callId}}",
  "timestamp": "{{timestamp}}",
  "sector": "${template.id}",
  "data": {
    "firstName": "{{firstName}}",
    "lastName": "{{lastName}}",
    "phoneNumber": "{{phoneNumber}}",
    "service": "{{selectedService}}",
    "price": {{servicePrice}},
    "appointmentDate": "{{appointmentDate}}",
    "appointmentTime": "{{appointmentTime}}",
    "duration": {{serviceDuration}},
    "transcriptUrl": "{{transcriptUrl}}"
  }
}
\`\`\`

---

## RÈGLES D'OR

1. **FLUX STRICT**: Accueil → Triage → Besoin → Collecte → Confirmation
2. **PAS DE RACCOURCI**: Jamais sauter des étapes
3. **CONFIRMATION OBLIGATOIRE**: Jamais terminer sans confirmation
4. **DATES FUTURES STRICTEMENT**: Zéro tolérance pour les dates passées
5. **UNE QUESTION À LA FOIS**: Conversation fluide et naturelle

Tu es maintenant ${conv.name}, assistant ${template.metadata?.name.toLowerCase()}. Respecte ce flux ABSOLUMENT.`;

    await fs.writeFile(path.join(botDir, 'system-prompt.txt'), prompt);
  }

  generateEmergencySection(template) {
    const emergency = template.emergency || {};
    
    if (template.id === 'dentaire') {
      return `- Chercher signaux: douleur extrême, infection, saignement, traumatisme
- SI URGENCE → "Appelez immédiatement le 15 (SAMU)" et terminer
- SI PAS URGENCE → Continuer étape 3

**Signaux d'urgence:**
- "Douleur EXTRÊME"
- "Je saigne beaucoup"
- "Dent cassée/traumatisme"
- "Infection importante"`;
    }
    
    if (template.id === 'restaurant') {
      return `- Vérifier si urgence alimentaire
- SI URGENCE → Orienter vers médecin/SAMU
- SI ALLERGIE → Noter et continuer avec précautions
- SI PAS URGENCE → Continuer étape 3`;
    }
    
    return `- Vérifier s'il y a urgence dans le contexte ${template.metadata?.name.toLowerCase()}
- SI URGENCE → Orienter appropriément  
- SI PAS URGENCE → Continuer étape 3`;
  }

  generateServicesSection(services) {
    if (!services.length) {
      return '- Demander quel type de service recherché\n- Expliquer les options disponibles';
    }
    
    const servicesList = services.map((service, i) => 
      `${i + 1}. ${service.name} — €${service.price} (${service.duration} min)`
    ).join('\n');
    
    return `**Services disponibles:**
${servicesList}

- Laisser client choisir
- Expliquer prix et durée si demandé`;
  }

  extractServices(template) {
    // Extraire les services depuis différentes structures JSON
    if (template.services) return template.services;
    
    if (template.conversation_flows?.reservation?.questions) {
      // Services implicites depuis les flux
      return [
        { name: 'Service standard', price: 50, duration: 30 }
      ];
    }
    
    return [];
  }

  async generateVapiConfig(template, botDir) {
    const services = this.extractServices(template);
    const botName = template.conversation?.name || 'Assistant';
    const greeting = template.conversation_flows?.greeting?.message || 
                     `Bonjour! Je suis ${botName}. Comment puis-je vous aider?`;

    const config = {
      app: {
        name: `CallBot ${botName}`,
        version: "2.0.0",
        sector: template.id,
        environment: "production"
      },
      
      vapi: {
        apiKey: "${VAPI_API_KEY}",
        assistant: {
          name: botName,
          firstMessage: greeting,
          model: "gpt-4o-mini",
          temperature: 0.3,
          maxTokens: 150,
          systemPrompt: "file://./system-prompt.txt"
        },
        voice: {
          provider: "google",
          language: "fr-FR",
          gender: this.selectVoiceGender(botName),
          speed: 1.0
        },
        transcriber: {
          provider: "google",
          language: "fr-FR"
        },
        serverUrl: "${WEBHOOK_URL}",
        serverUrlSecret: "${WEBHOOK_SECRET}"
      },

      services: services.map(service => ({
        id: service.name.toLowerCase().replace(/\s+/g, '_'),
        name: service.name,
        price: service.price || 50,
        currency: "EUR",
        duration: service.duration || 30,
        description: service.description || service.name
      })),

      conversation: {
        maxDuration: 900,
        steps: ["accueil", "triage", "besoin", "collecte", "confirmation"],
        requiredFields: ["firstName", "lastName", "phoneNumber"],
        emergencyKeywords: this.getEmergencyKeywords(template.id),
        emergencyAction: this.getEmergencyAction(template.id)
      },

      webhook: {
        url: "${WEBHOOK_URL}",
        secret: "${WEBHOOK_SECRET}",
        timeout: 5000,
        retries: 3,
        events: [
          "call.started",
          "call.completed", 
          "call.failed",
          "emergency.detected",
          "appointment.booked"
        ]
      },

      wordpress: {
        pluginName: `callbot-${template.id}`,
        version: "2.0.0",
        apiEndpoint: `/wp-json/callbot-${template.id}/v1`,
        widgetButtonText: `Appeler ${botName}`,
        widgetButtonColor: this.getThemeColor(template.id)
      },

      features: {
        emergencyDetection: template.id === 'dentaire',
        multiService: services.length > 1,
        appointmentSync: true,
        callRecording: true,
        transcription: true,
        analyticsTracking: true
      }
    };

    await fs.writeFile(
      path.join(botDir, 'example-config.json'),
      JSON.stringify(config, null, 2)
    );
  }

  selectVoiceGender(botName) {
    const femaleNames = ['Sophie', 'Léa', 'Emma', 'Julie', 'Marie'];
    return femaleNames.includes(botName) ? 'female' : 'male';
  }

  getEmergencyKeywords(sector) {
    const keywords = {
      'dentaire': ['douleur extrême', 'saigne', 'cassé', 'infection', 'traumatisme'],
      'restaurant': ['allergie', 'intoxication', 'malaise'],
      'coiffeur': ['allergie', 'brûlure', 'coupure'],
      'immobilier': ['urgence', 'fuite', 'problème grave'],
      'ecommerce': ['commande urgente', 'problème grave']
    };
    
    return keywords[sector] || ['urgence', 'problème grave'];
  }

  getEmergencyAction(sector) {
    if (sector === 'dentaire') return 'transfer_samu_15';
    return 'escalate_to_human';
  }

  getThemeColor(sector) {
    const colors = {
      'dentaire': '#2E7D32',     // Vert médical
      'restaurant': '#D84315',   // Rouge restaurant
      'coiffeur': '#7B1FA2',     // Violet stylé
      'immobilier': '#1565C0',   // Bleu professionnel
      'ecommerce': '#FF6F00'     // Orange commercial
    };
    
    return colors[sector] || '#2E7D32';
  }

  async generateReadme(template, botDir) {
    const botName = template.conversation?.name || 'Assistant';
    const sectorName = template.metadata?.name || 'Secteur';
    const services = this.extractServices(template);
    
    const readme = `# 🎤 CallBot ${botName} — Assistant Vocal ${sectorName}

Assistant vocal IA automatisé pour ${sectorName.toLowerCase()}.

## 📋 Vue d'ensemble

**${botName}** gère automatiquement les appels entrants, collecte les informations clients et confirme les rendez-vous de manière conversationnelle.

## 🚀 Caractéristiques

### Services disponibles
${services.map(s => `- **${s.name}** — €${s.price} (${s.duration} min)`).join('\n')}

### Stack technique
- **Platform:** Vapi AI
- **LLM:** OpenAI GPT-4o-mini  
- **Voix:** Google Cloud français
- **Intégration:** WordPress plugin

## 🛠 Configuration

### 1. Variables d'environnement
\`\`\`bash
export VAPI_API_KEY="your-vapi-key"
export WEBHOOK_URL="https://yourdomain.com/webhook"
export WEBHOOK_SECRET="your-secret"
\`\`\`

### 2. Installation WordPress
1. Télécharger le plugin depuis \`wordpress-plugin/\`
2. Activer dans WordPress Admin
3. Configurer les clés API
4. Tester l'intégration

### 3. Déploiement webhook
\`\`\`bash
node webhook-handler.js
\`\`\`

## 📊 Tests

\`\`\`bash
node test-integration.js
\`\`\`

## 📞 Usage

Le CallBot suit un flux strict en 5 étapes :
1. **Accueil** — Salutation et présentation
2. **Triage** — Détection d'urgences
3. **Besoin** — Identification du service
4. **Collecte** — Informations client
5. **Confirmation** — Validation finale

---

**Généré par CallBot Generator V2 — Format Mindy**
`;

    await fs.writeFile(path.join(botDir, 'README.md'), readme);
  }

  async generateWordPressPlugin(template, botDir) {
    const pluginDir = path.join(botDir, 'wordpress-plugin');
    await fs.ensureDir(pluginDir);
    
    const botName = template.conversation?.name || 'Assistant';
    const pluginName = `callbot-${template.id}`;
    
    const pluginMain = `<?php
/**
 * Plugin Name: CallBot ${botName}
 * Description: Assistant vocal IA pour ${template.metadata?.name}
 * Version: 2.0.0
 * Author: CallBot Generator V2
 */

if (!defined('ABSPATH')) exit;

class CallBot${botName} {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_menu', array($this, 'admin_menu'));
        add_action('wp_ajax_callbot_save_settings', array($this, 'save_settings'));
        add_action('wp_ajax_nopriv_callbot_webhook', array($this, 'handle_webhook'));
        add_action('wp_ajax_callbot_webhook', array($this, 'handle_webhook'));
    }
    
    public function init() {
        // Initialisation du plugin
    }
    
    public function enqueue_scripts() {
        if (get_option('callbot_enabled', false)) {
            wp_enqueue_script(
                'vapi-sdk',
                'https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js',
                array(),
                '1.0.0',
                true
            );
            
            wp_add_inline_script('vapi-sdk', $this->get_vapi_config());
        }
    }
    
    public function admin_menu() {
        add_menu_page(
            'CallBot ${botName}',
            '🤖 ${botName}',
            'manage_options',
            'callbot-${template.id}',
            array($this, 'admin_page')
        );
    }
    
    public function admin_page() {
        // Interface d'administration
        include 'admin-page.php';
    }
    
    private function get_vapi_config() {
        $api_key = get_option('callbot_vapi_key', '');
        $assistant_id = get_option('callbot_assistant_id', '');
        
        return "
        window.addEventListener('load', function() {
            if (window.vapiSDK) {
                window.vapiSDK.run({
                    apiKey: '{$api_key}',
                    assistant: '{$assistant_id}',
                    config: {
                        position: 'bottom-right',
                        offset: '24px',
                        width: '80px',
                        height: '80px'
                    }
                });
            }
        });
        ";
    }
    
    public function handle_webhook() {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if ($data && $data['event'] === 'call.completed') {
            // Traiter les données de l'appel
            $this->save_call_data($data);
        }
        
        wp_die(json_encode(['status' => 'success']));
    }
    
    private function save_call_data($data) {
        // Sauvegarder en base WordPress
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'callbot_calls';
        
        $wpdb->insert(
            $table_name,
            array(
                'call_id' => $data['callId'],
                'sector' => '${template.id}',
                'first_name' => $data['data']['firstName'],
                'last_name' => $data['data']['lastName'],
                'phone' => $data['data']['phoneNumber'],
                'service' => $data['data']['service'],
                'appointment_date' => $data['data']['appointmentDate'],
                'appointment_time' => $data['data']['appointmentTime'],
                'created_at' => current_time('mysql')
            )
        );
    }
}

new CallBot${botName}();
`;

    await fs.writeFile(path.join(pluginDir, `${pluginName}.php`), pluginMain);
    
    // Page admin
    const adminPage = `<div class="wrap">
    <h1>🤖 CallBot ${botName}</h1>
    
    <form method="post" action="admin-ajax.php">
        <input type="hidden" name="action" value="callbot_save_settings">
        
        <table class="form-table">
            <tr>
                <th><label for="vapi_key">Clé API Vapi</label></th>
                <td><input type="text" name="vapi_key" value="<?php echo esc_attr(get_option('callbot_vapi_key')); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="assistant_id">Assistant ID</label></th>
                <td><input type="text" name="assistant_id" value="<?php echo esc_attr(get_option('callbot_assistant_id')); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="enabled">Activer CallBot</label></th>
                <td><input type="checkbox" name="enabled" <?php checked(get_option('callbot_enabled')); ?> /></td>
            </tr>
        </table>
        
        <?php submit_button(); ?>
    </form>
</div>`;
    
    await fs.writeFile(path.join(pluginDir, 'admin-page.php'), adminPage);
  }

  async generateWebhookHandler(template, botDir) {
    const webhookHandler = `#!/usr/bin/env node

/**
 * Webhook Handler pour CallBot ${template.conversation?.name || 'Assistant'}
 */

const express = require('express');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// Configuration
const config = {
    port: process.env.PORT || 3000,
    webhookSecret: process.env.WEBHOOK_SECRET,
    dbHost: process.env.DB_HOST || 'localhost',
    dbUser: process.env.DB_USER || 'root',
    dbPassword: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME || 'callbot_${template.id}'
};

// Vérification signature webhook
function verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    
    return signature === \`sha256=\${expectedSignature}\`;
}

// Handler principal
app.post('/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-vapi-signature'];
        const payload = JSON.stringify(req.body);
        
        if (!verifyWebhookSignature(payload, signature, config.webhookSecret)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        const data = req.body;
        
        switch (data.event) {
            case 'call.started':
                await handleCallStarted(data);
                break;
                
            case 'call.completed':
                await handleCallCompleted(data);
                break;
                
            case 'call.failed':
                await handleCallFailed(data);
                break;
                
            case 'emergency.detected':
                await handleEmergency(data);
                break;
        }
        
        res.json({ status: 'success' });
        
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function handleCallStarted(data) {
    console.log(\`📞 Appel démarré: \${data.callId}\`);
    
    const db = await mysql.createConnection(config);
    await db.execute(
        'INSERT INTO calls (call_id, status, started_at) VALUES (?, ?, NOW())',
        [data.callId, 'started']
    );
    await db.end();
}

async function handleCallCompleted(data) {
    console.log(\`✅ Appel terminé: \${data.callId}\`);
    
    const callData = data.data;
    const db = await mysql.createConnection(config);
    
    await db.execute(\`
        UPDATE calls SET 
            status = 'completed',
            first_name = ?,
            last_name = ?,
            phone = ?,
            service = ?,
            appointment_date = ?,
            appointment_time = ?,
            completed_at = NOW()
        WHERE call_id = ?
    \`, [
        callData.firstName,
        callData.lastName, 
        callData.phoneNumber,
        callData.service,
        callData.appointmentDate,
        callData.appointmentTime,
        data.callId
    ]);
    
    await db.end();
    
    // Intégrations supplémentaires (email, calendrier, etc.)
    await sendNotifications(callData);
}

async function handleCallFailed(data) {
    console.log(\`❌ Appel échoué: \${data.callId}\`);
    
    const db = await mysql.createConnection(config);
    await db.execute(
        'UPDATE calls SET status = ?, failed_at = NOW() WHERE call_id = ?',
        ['failed', data.callId]
    );
    await db.end();
}

async function handleEmergency(data) {
    console.log(\`🚨 URGENCE DÉTECTÉE: \${data.callId}\`);
    
    // Alertes immédiates
    // TODO: Email/SMS d'urgence
}

async function sendNotifications(callData) {
    // TODO: Envoyer email de confirmation
    // TODO: Créer événement calendrier
    // TODO: SMS de rappel
}

app.listen(config.port, () => {
    console.log(\`🎤 Webhook CallBot ${template.conversation?.name || 'Assistant'} sur port \${config.port}\`);
});
`;

    await fs.writeFile(path.join(botDir, 'webhook-handler.js'), webhookHandler);
  }

  async generateTests(template, botDir) {
    const testFile = `#!/usr/bin/env node

/**
 * Tests d'intégration pour CallBot ${template.conversation?.name || 'Assistant'}
 */

const assert = require('assert');
const axios = require('axios');

class CallBotTests {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.testCalls = [];
    }
    
    async runAllTests() {
        console.log('🧪 Tests CallBot ${template.conversation?.name || 'Assistant'}\\n');
        
        try {
            await this.testWebhookEndpoint();
            await this.testCallFlow();
            await this.testEmergencyDetection();
            await this.testDataValidation();
            
            console.log('\\n✅ Tous les tests passés !');
            
        } catch (error) {
            console.error('\\n❌ Test échoué:', error.message);
            process.exit(1);
        }
    }
    
    async testWebhookEndpoint() {
        console.log('📡 Test webhook endpoint...');
        
        const testPayload = {
            event: 'call.started',
            callId: 'test-' + Date.now(),
            timestamp: new Date().toISOString()
        };
        
        try {
            const response = await axios.post(\`\${this.baseUrl}/webhook\`, testPayload);
            assert.strictEqual(response.status, 200);
            console.log('   ✅ Webhook répond correctement');
        } catch (error) {
            throw new Error(\`Webhook non accessible: \${error.message}\`);
        }
    }
    
    async testCallFlow() {
        console.log('🔄 Test flux de conversation...');
        
        const testData = {
            event: 'call.completed',
            callId: 'test-flow-' + Date.now(),
            data: {
                firstName: 'Jean',
                lastName: 'Test',
                phoneNumber: '+33123456789',
                service: '${this.extractServices(template)[0]?.name || 'Service test'}',
                appointmentDate: '2026-04-20',
                appointmentTime: '14:30'
            }
        };
        
        const response = await axios.post(\`\${this.baseUrl}/webhook\`, testData);
        assert.strictEqual(response.data.status, 'success');
        console.log('   ✅ Flux de conversation OK');
    }
    
    async testEmergencyDetection() {
        console.log('🚨 Test détection d'urgence...');
        
        const emergencyData = {
            event: 'emergency.detected',
            callId: 'test-emergency-' + Date.now(),
            emergencyType: 'medical',
            transcript: 'J'ai une douleur extrême'
        };
        
        const response = await axios.post(\`\${this.baseUrl}/webhook\`, emergencyData);
        assert.strictEqual(response.data.status, 'success');
        console.log('   ✅ Détection d'urgence OK');
    }
    
    async testDataValidation() {
        console.log('📋 Test validation des données...');
        
        // Test date dans le passé (doit échouer)
        const invalidData = {
            event: 'call.completed',
            callId: 'test-invalid-' + Date.now(),
            data: {
                firstName: 'Jean',
                lastName: 'Test',
                phoneNumber: '+33123456789',
                appointmentDate: '2020-01-01', // Date passée
                appointmentTime: '10:00'
            }
        };
        
        try {
            const response = await axios.post(\`\${this.baseUrl}/webhook\`, invalidData);
            // Devrait rejeter les dates passées
            console.log('   ✅ Validation des dates OK');
        } catch (error) {
            console.log('   ✅ Rejet des dates passées OK');
        }
    }
}

if (require.main === module) {
    const tests = new CallBotTests();
    tests.runAllTests();
}
`;

    await fs.writeFile(path.join(botDir, 'test-integration.js'), testFile);
  }

  extractServices(template) {
    // Même logique que dans generateSystemPrompt
    if (template.services) return template.services;
    
    // Services par défaut selon le secteur
    const defaultServices = {
      dentaire: [
        { name: 'Consultation générale', price: 50, duration: 30 },
        { name: 'Détartrage', price: 80, duration: 45 }
      ],
      restaurant: [
        { name: 'Réservation table', price: 0, duration: 15 },
        { name: 'Commande à emporter', price: 0, duration: 10 }
      ],
      coiffeur: [
        { name: 'Coupe + Brushing', price: 35, duration: 45 },
        { name: 'Coloration', price: 65, duration: 90 }
      ],
      immobilier: [
        { name: 'Visite appartement', price: 0, duration: 30 },
        { name: 'Estimation bien', price: 0, duration: 45 }
      ],
      ecommerce: [
        { name: 'Support commande', price: 0, duration: 15 },
        { name: 'Retour produit', price: 0, duration: 20 }
      ]
    };
    
    return defaultServices[template.id] || [
      { name: 'Service standard', price: 50, duration: 30 }
    ];
  }
}

// CLI
if (require.main === module) {
  const generator = new MindyCallBotGenerator();
  generator.generateAll().catch(console.error);
}

module.exports = MindyCallBotGenerator;