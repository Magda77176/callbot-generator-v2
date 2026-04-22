const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const VAPI_API_KEY = env.match(/VAPI_API_KEY=(.+)/)?.[1]?.trim();

const ASSISTANT_ID = '4e8f5144-1fe0-49b0-bc05-9129e0dd4005';

const patch = {
  // Voice inchangée — c'est celle que Sullivan teste actuellement via /test
  // Si besoin de forcer une voix : décommenter le bloc voice ci-dessous
  // voice: { provider: '11labs', voiceId: 'IbbR6Av0dWuQJS0b8JVT', model: 'eleven_flash_v2_5', language: 'fr', stability: 0.5, similarityBoost: 0.75, style: 0.45, useSpeakerBoost: true },

  // Conversation settings pour sonner humain
  backchannelingEnabled: true,
  backgroundDenoisingEnabled: true,

  numWordsToInterruptAssistant: 3,
  responseDelaySeconds: 0.4,
  silenceTimeoutSeconds: 20,
  backgroundSound: 'off',

  startSpeakingPlan: {
    waitSeconds: 0.4,
    smartEndpointingEnabled: 'livekit',
  },
  stopSpeakingPlan: {
    numWords: 3,
    voiceSeconds: 0.2,
    backoffSeconds: 1.0,
  },
  backgroundSpeechDenoisingPlan: {
    smartDenoisingPlan: { enabled: true },
  },
};

async function main() {
  const res = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    console.error('Erreur HTTP', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  console.log('✅ Bot mis à jour');
  console.log('   voice.model:', data.voice?.model);
  console.log('   voice.provider:', data.voice?.provider);
  console.log('   backchannelingEnabled:', data.backchannelingEnabled);
  console.log('   backgroundDenoisingEnabled:', data.backgroundDenoisingEnabled);
  console.log('   numWordsToInterruptAssistant:', data.numWordsToInterruptAssistant);
  console.log('   responseDelaySeconds:', data.responseDelaySeconds);
  console.log('   backgroundSound:', data.backgroundSound);
  console.log('   startSpeakingPlan:', JSON.stringify(data.startSpeakingPlan));
  console.log('   stopSpeakingPlan:', JSON.stringify(data.stopSpeakingPlan));
  console.log('   backgroundSpeechDenoisingPlan:', JSON.stringify(data.backgroundSpeechDenoisingPlan));
}

main();
