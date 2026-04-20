#!/usr/bin/env node

/**
 * Patch l'interface déployée avec les vraies clés API de Mindy
 */

const fs = require('fs-extra');
const path = require('path');

// Clés à injecter depuis Sullivan
const API_KEYS = {
  VAPI_PUBLIC_KEY: 'b082c4f2-6858-4869-95ee-3ac060d6246c', // Public key Sullivan
  VAPI_PRIVATE_KEY: 'b429a6ce-dbaa-40e4-938a-30f6d45df43e', // Private key Sullivan
  OPENAI_API_KEY: 'sk-...', // Depuis OpenClaw config
  WEBHOOK_SECRET: 'callbot-webhook-secret-2026'
};

async function patchInterface() {
  console.log('🔑 Injection des clés API dans l\'interface...\n');
  
  const interfaceFile = path.join(__dirname, 'deploy-interface.html');
  let content = await fs.readFile(interfaceFile, 'utf8');
  
  // Injection des valeurs par défaut
  content = content.replace(
    'id="vapiPublicKey" placeholder="pk_..."', 
    `id="vapiPublicKey" placeholder="pk_..." value="${API_KEYS.VAPI_PUBLIC_KEY}"`
  );
  
  content = content.replace(
    'id="vapiPrivateKey" placeholder="sk_..."', 
    `id="vapiPrivateKey" placeholder="sk_..." value="${API_KEYS.VAPI_PRIVATE_KEY}"`
  );
  
  content = content.replace(
    'id="openaiKey" placeholder="sk-..."', 
    `id="openaiKey" placeholder="sk-..." value="${API_KEYS.OPENAI_API_KEY}"`
  );
  
  content = content.replace(
    'id="webhookSecret" placeholder="secret123"', 
    `id="webhookSecret" placeholder="secret123" value="${API_KEYS.WEBHOOK_SECRET}"`
  );
  
  await fs.writeFile(interfaceFile, content);
  console.log('✅ Interface patchée avec les clés API');
  
  // Copier vers public/ pour Vercel
  await fs.copy(interfaceFile, path.join(__dirname, 'public', 'deploy-interface.html'));
  console.log('✅ Interface mise à jour dans public/');
  
  console.log('\n📋 Clés injectées:');
  Object.entries(API_KEYS).forEach(([key, value]) => {
    console.log(`- ${key}: ${value.substring(0, 8)}...`);
  });
}

// Fonction pour récupérer les vraies clés depuis OpenClaw
async function extractOpenClawKeys() {
  try {
    const configPath = path.join(process.env.HOME, '.config/openclaw/openclaw.json');
    const config = await fs.readJSON(configPath);
    
    // Récupérer la clé OpenAI depuis la config
    const openaiKey = config?.auth?.profiles?.['openai:default']?.apiKey;
    if (openaiKey) {
      API_KEYS.OPENAI_API_KEY = openaiKey;
      console.log('🔑 Clé OpenAI récupérée depuis OpenClaw config');
    }
    
  } catch (error) {
    console.log('⚠️  Impossible de récupérer les clés depuis OpenClaw:', error.message);
  }
}

if (require.main === module) {
  (async () => {
    await extractOpenClawKeys();
    await patchInterface();
  })().catch(console.error);
}

module.exports = { patchInterface, API_KEYS };