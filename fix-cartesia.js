#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

async function fixCartesiaConfig() {
  const configFiles = [
    'generated-mindy/callbot-restaurant/example-config.json',
    'generated-mindy/callbot-coiffeur/example-config.json',
    'generated-mindy/callbot-dentaire/example-config.json',
    'generated-mindy/callbot-immobilier/example-config.json',
    'generated-mindy/callbot-ecommerce/example-config.json'
  ];

  for (const configFile of configFiles) {
    const filePath = path.join(__dirname, configFile);
    if (!await fs.pathExists(filePath)) continue;

    console.log(`🔧 Fixing ${configFile}...`);
    
    let content = await fs.readFile(filePath, 'utf8');
    
    // Replace Google with Cartesia in voice config
    content = content.replace(
      /"voice": \{[^}]*\}/gs,
      `"voice": {
      "provider": "cartesia",
      "language": "fr-FR",
      "voiceId": "79a125e8-cd45-4c13-8a67-188112f4dd22",
      "model": "sonic-multilingual"
    }`
    );
    
    // Keep transcriber as Google (more reliable for French)
    content = content.replace(
      /"transcriber": \{[^}]*\}/gs,
      `"transcriber": {
      "provider": "google",
      "language": "fr-FR"
    }`
    );
    
    await fs.writeFile(filePath, content);
    console.log(`✅ Fixed ${configFile}`);
  }
  
  console.log('🎉 All config files updated with Cartesia voice!');
}

if (require.main === module) {
  fixCartesiaConfig().catch(console.error);
}

module.exports = { fixCartesiaConfig };