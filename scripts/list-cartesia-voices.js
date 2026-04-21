#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const key = fs.readFileSync('.env.local', 'utf8').match(/CARTESIA_API_KEY=(.+)/)[1].trim();

https.get(
  'https://api.cartesia.ai/voices/?language=fr&limit=100',
  {
    headers: {
      'X-API-Key': key,
      'Cartesia-Version': '2026-03-01',
    },
  },
  (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      const voices = JSON.parse(data).data || JSON.parse(data);

      // Filtre qualité : on exclut les voix inadaptées à l'accueil téléphonique
      const blacklist = /stern|dark|authoritative|baritone storyteller|funeral|evil|monster/i;

      const keepers = voices.filter((v) => {
        const desc = (v.description || '').toLowerCase();
        return !blacklist.test(desc);
      });

      const males = keepers.filter((v) => v.gender === 'masculine' || v.gender === 'male');
      const females = keepers.filter((v) => v.gender === 'feminine' || v.gender === 'female');

      console.log('\n=== MASCULINES (' + males.length + ') ===');
      males.forEach((v) => console.log(v.id, '|', v.name, '|', (v.description || '').slice(0, 90)));

      console.log('\n=== FÉMININES (' + females.length + ') ===');
      females.forEach((v) => console.log(v.id, '|', v.name, '|', (v.description || '').slice(0, 90)));

      console.log('\nTotal utilisables : ' + keepers.length + ' voix');
    });
  },
);
