const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const VAPI_API_KEY = env.match(/VAPI_API_KEY=(.+)/)?.[1]?.trim();

const ASSISTANT_ID = '4e8f5144-1fe0-49b0-bc05-9129e0dd4005';

const patch = {
  voice: {
    provider: 'cartesia',
    voiceId: '80e11491-2d8a-4361-ac61-c4f3e0a4f7e7',  // Vincent - énergique engageant
    model: 'sonic-3',
    language: 'fr',
    experimentalControls: {
      speed: 'slow',
      emotion: ['positivity:high', 'curiosity:high'],
    },
  },
  numWordsToInterruptAssistant: 4,
  responseDelaySeconds: 1.0,
  silenceTimeoutSeconds: 20,
  backgroundSound: 'off',
  startSpeakingPlan: {
    waitSeconds: 0.8,
    smartEndpointingEnabled: 'livekit',
  },
  stopSpeakingPlan: {
    numWords: 4,
    voiceSeconds: 0.3,
    backoffSeconds: 1.5,
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
  console.log('   model:', data.voice?.model);
  console.log('   voice.experimentalControls:', JSON.stringify(data.voice?.experimentalControls));
  console.log('   numWordsToInterruptAssistant:', data.numWordsToInterruptAssistant);
  console.log('   responseDelaySeconds:', data.responseDelaySeconds);
  console.log('   backgroundSound:', data.backgroundSound);
  console.log('   startSpeakingPlan:', JSON.stringify(data.startSpeakingPlan));
  console.log('   stopSpeakingPlan:', JSON.stringify(data.stopSpeakingPlan));
  console.log('   backgroundSpeechDenoisingPlan:', JSON.stringify(data.backgroundSpeechDenoisingPlan));
}

main();
